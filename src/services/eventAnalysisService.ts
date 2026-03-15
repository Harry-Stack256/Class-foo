import OpenAI from 'openai';
import pLimit from 'p-limit';

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY || ""
});

const limit = pLimit(3);
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const FAST_MODEL = "Qwen/Qwen2.5-7B-Instruct";

async function generateCompletion(params: any) {
  return await limit(async () => {
    try {
      return await openai.chat.completions.create(params);
    } catch (error: any) {
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await openai.chat.completions.create(params);
      }
      if (error.status === 403) {
        console.log("DEBUG API 403 Error: Falling back to FAST_MODEL...");
        params.model = FAST_MODEL;
        return await openai.chat.completions.create(params);
      }
      throw error;
    }
  });
}

// --- Models for State Management ---

interface Committee {
  name: string;
  tags: string[];
  directive: string;
}

interface CommitteeAudit {
  committee_name: string;
  compatibility_score: number;
  feedback: string;
}

// --- Components ---

class DataFilter {
  static async filter_culinary_tags(guest_tags: string[]): Promise<[string[], string[]]> {
    const system_prompt = `You are a Culinary Domain Filter. Your goal is to preserve ANY data related to food/beverage consumption.

STRICT RETENTION RULES (KEEP THESE):
- 'Name: ' prefixes.
- Allergies, Celiac, Diabetic, Kosher, Vegan, Halal.
- Niche diets (Lion Diet, Carnivore, Keto).
- Sobriety/Recovery (e.g. 'sober', 'alcoholic', 'no alcohol').
- Physical reactions (e.g. 'inflammation', 'heartburn', 'gout').
- Specific 'no [x]', 'only [x]', 'strictly [x]', 'avoid [x]' constraints.

Discard only true fluff (hobbies, shoes, pets, fonts, vinyl, music, favorite colors).

Output Format: A JSON object with two keys: 'culinary' and 'dropped'. Value is an array of strings.`;
    
    try {
      const response = await generateCompletion({
        model: FAST_MODEL,
        messages: [
          {"role": "system", "content": system_prompt},
          {"role": "user", "content": `Guest Tags: ${JSON.stringify(guest_tags)}`}
        ],
        temperature: 0.0,
        response_format: { type: "json_object" }
      });
      const res = JSON.parse(response.choices[0].message.content || '{"culinary": [], "dropped": []}');
      return [res.culinary || [], res.dropped || []];
    } catch (e) {
      console.error(`DEBUG Layer 0 Exception: ${e}`);
      return [guest_tags, []];
    }
  }
}

class Delegator {
  static async cluster_tags(safe_tags: string[]): Promise<Committee[]> {
    if (safe_tags.length === 0) {
      return [{name: "General Audit", tags: [], directive: "General audit committee for event analysis."}];
    }
    
    const system_prompt = `You are the Lead Auditor. Your task is to cluster provided User Tags into specialized Committee Audits.

STRICT DISCARD RULE:
Discard any tag that is NOT a food/beverage requirement (e.g. hobbies, interests, sounds, colors). Only process dietary requirements.

Audit Mandate:
- Partition the list into 4-7 distinct committees. Do NOT create more than 10 committees.
- Use simple names (e.g. 'Vegan Audit', 'Allergy Audit', 'Diabetic Audit'). Do NOT concatenate multiple guest requirements into one name.
- Ensure EVERY guest with a culinary constraint is assigned to exactly one relevant committee.

Output Format:
COMMITTEE: [Simple Name] | TAGS: [Full Guest Tag(s)] | ROLE: [Factual Diagnostic objective]
Factual Role: Use 'Analyze [GuestName] for [Specific Category] conflicts'.`;
    
    try {
      const response = await generateCompletion({
        model: DEFAULT_MODEL,
        messages: [
          {"role": "system", "content": system_prompt},
          {"role": "user", "content": `User Tags: ${safe_tags.join(', ')}`}
        ],
        temperature: 0.1
      });
      
      const content = response.choices[0].message.content || "";
      const committees: Committee[] = [];
      for (const line of content.split('\n')) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('COMMITTEE:') && trimmedLine.includes('TAGS:') && trimmedLine.includes('ROLE:')) {
          try {
            const name_part = trimmedLine.split('COMMITTEE:')[1].split('|')[0].trim();
            const tags_part = trimmedLine.split('TAGS:')[1].split('|')[0].trim();
            const role_part = trimmedLine.split('ROLE:')[1].trim();
            
            const tags = tags_part.replace(/[\[\]]/g, '').split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
            committees.push({name: name_part, tags: tags, directive: role_part});
          } catch (e) {
            console.error(`DEBUG Error parsing TEKV line: ${trimmedLine} - ${e}`);
          }
        }
      }
      
      if (committees.length === 0) {
        throw new Error("No valid committees formed after parsing TEKV format.");
      }
      
      return committees;
    } catch (e) {
      console.error(`Layer 1 Warning: Failed to cluster. Defaulting to General Audit. (${e})`);
      return [{
        name: "General Audit", 
        tags: safe_tags, 
        directive: "Conduct a general audit of the event based on the provided tags."
      }];
    }
  }
}

class CommitteeSimulation {
  static async run_audit(committee: Committee, event_description: string): Promise<CommitteeAudit> {
    const system_prompt = `You are the ${committee.name} committee.
Role: ${committee.directive}
Guest Tags: ${JSON.stringify(committee.tags)}

Task: Audit the menu for direct culinary conflicts. Do NOT provide advice. Output ONLY in this JSON format:
{
  "score": 0-100,
  "conflicts": [
    {"guest": "Name", "constraint": "Requirement", "item": "Sub-string from menu", "reason": "Diagnostic fact"}
  ]
}

Critical: Use the actual Guest Name and Constraint Tag provided in the Guest Tags data.`;
    
    try {
      const response = await generateCompletion({
        model: DEFAULT_MODEL,
        messages: [
          {"role": "system", "content": system_prompt},
          {"role": "user", "content": `Event Description: ${event_description}`}
        ],
        temperature: 0.1,
        max_tokens: 500
      });
      const feedback = response.choices[0].message.content || "";
      let score = 0;
      let clean_feedback = "[]";
      
      try {
        const json_match = feedback.match(/\{.*\}/s);
        const json_str = json_match ? json_match[0] : feedback;
        
        const res = JSON.parse(json_str);
        score = res.score || 0;
        let conflicts = res.conflicts || [];
        if (conflicts.length === 0 && score < 100) {
          conflicts = [{"guest": "Unknown", "item": "All menu items", "reason": "General incompatibility reported"}];
        }
        clean_feedback = JSON.stringify(conflicts);
      } catch (e) {
        console.error(`DEBUG Committee '${committee.name}' JSON Parse Error: ${e}`);
      }
      
      return {
        committee_name: committee.name,
        compatibility_score: score,
        feedback: clean_feedback
      };
    } catch (e) {
      return {
        committee_name: committee.name,
        compatibility_score: 0,
        feedback: `Audit failed: ${e}`
      };
    }
  }
}

class AsyncCoordinator {
  static async run_parallel_audits(committees: Committee[], event_description: string): Promise<CommitteeAudit[]> {
    async function run_with_timeout(c: Committee): Promise<CommitteeAudit> {
      try {
        const timeoutPromise = new Promise<CommitteeAudit>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 15000)
        );
        return await Promise.race([CommitteeSimulation.run_audit(c, event_description), timeoutPromise]);
      } catch (e) {
        return {
          committee_name: c.name,
          compatibility_score: 50,
          feedback: `Committee ${c.name} timed out; preference unknown.`
        };
      }
    }
    
    return await Promise.all(committees.map(run_with_timeout));
  }
}

class SynthesisEngine {
  static async synthesize(audits: CommitteeAudit[], hard_constraints: string[], event_description: string): Promise<string> {
    const system_prompt = `You are the JSON Results Aggregator.

Task: Consolidate the provided JSON conflict lists into a single exhaustive report. Do NOT skip any guests.

Rules:
1. No Advice: Forbid 'Should', 'Substitute', or 'Prepare'. Use only diagnostic facts.
2. Grouping: Sort guests into critical_safety_gaps (Allergies, Celiac, Diabetic, Recovery) or dietary_conflicts (Vegan, Gout, Protein, Keto).
3. beverage_logistics: Factual notes about alcohol, caffeine, or unpasteurized content.
4. Name Retention: Use the Guest Names exactly as they appear in the committee reports.
5. Strict Counting: The 'audit_summary' counts must EXACTLY match the number of items in the corresponding arrays.

Output Format: Output ONLY valid JSON matching this schema:
{
  "event_metadata": {"event_id": "friendsgiving-2026", "timestamp": "2026-03-15T03:33:00Z"},
  "audit_summary": {
    "critical_count": 0,
    "dietary_count": 0,
    "beverage_count": 0
  },
  "report": {
    "critical_safety_gaps": [ {"guest": "Name", "constraint": "Specific Tag", "conflicting_items": [], "reason": "Fact-based reason"} ],
    "dietary_conflicts": [ {"guest": "Name", "constraint": "Specific Tag", "conflicting_items": [], "reason": "Fact-based reason"} ],
    "beverage_logistics": {"neutral_observations": [{"guest": "Name", "note": "Diagnostic observation"} ]}
  }
}`;
    
    const audits_text = audits.map(a => `COMMITTEE: ${a.committee_name}\nJSON_LIST: ${a.feedback}`).join('\n\n');
    
    const response = await generateCompletion({
      model: DEFAULT_MODEL,
      messages: [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": `Event Description: ${event_description}\n\nCommittee Feedbacks:\n${audits_text}`}
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content || "{}";
    return content.replace(/```json\n?|```/g, '').trim();
  }
}

export async function analyzeEvent(event: any): Promise<any> {
  const eventDescription = `${event.title}\n${event.description}`;
  const attendees = event.attendees.filter((a: any) => a.status === 'yes').map((a: any) => ({
    name: a.userId?.name || 'Unknown',
    tags: a.userId?.tags || []
  }));
  const guestTags = attendees.flatMap((a: any) => a.tags);

  const [culinaryTags] = await DataFilter.filter_culinary_tags(guestTags);
  const committees = await Delegator.cluster_tags(culinaryTags);
  const audits = await AsyncCoordinator.run_parallel_audits(committees, eventDescription);
  const final_brief = await SynthesisEngine.synthesize(audits, [], eventDescription);
  
  return JSON.parse(final_brief);
}
