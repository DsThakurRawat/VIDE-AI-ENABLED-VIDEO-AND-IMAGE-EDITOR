import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

OPERATION_REGISTRY = {
    "trim": {"params": {"start": "number", "end": "number", "action": "string"}},
    "split": {"params": {"at": "number"}},
    "merge": {"params": {"with": "string"}},
    "loop": {"params": {"count": "number"}},
    "fade_in": {"params": {"duration_ms": "number"}},
    "fade_out": {"params": {"duration_ms": "number"}},
    "crossfade": {"params": {"duration_ms": "number"}},
    "dissolve": {"params": {"duration_ms": "number"}},
    "color_grade": {"params": {"lut": "string", "saturation": "number", "brightness": "number", "contrast": "number"}},
    "lut_apply": {"params": {"lut": "string"}},
    "saturation": {"params": {"value": "number"}},
    "brightness": {"params": {"value": "number"}},
    "contrast": {"params": {"value": "number"}},
    "denoise_audio": {"params": {"strength": "number"}},
    "eq_bass": {"params": {"gain_db": "number"}},
    "eq_treble": {"params": {"gain_db": "number"}},
    "normalize_loudness": {"params": {"target_lufs": "number"}},
    "remove_background": {"params": {}},
    "remove_object": {"params": {"object": "string", "frame": "number"}},
    "inpaint": {"params": {"mask": "string"}},
    "style_transfer": {"params": {"style": "string"}},
    "upscale": {"params": {"factor": "number"}},
    "slow_motion": {"params": {"factor": "number"}},
    "speed_ramp": {"params": {"start_speed": "number", "end_speed": "number"}},
    "stabilize": {"params": {"shakiness": "number"}},
    "export": {"params": {"resolution": "string", "codec": "string", "crf": "number"}},
    "preview": {"params": {"quality": "string"}},
    "thumbnail": {"params": {"at": "number"}},
    "subtitle": {"params": {"language": "string"}},
    "transcribe": {"params": {"language": "string"}},
}

class NLPPlanner:
    def __init__(self, use_local_model: bool = False):
        self.use_local_model = use_local_model
        self.client = None

        if not use_local_model:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key and api_key != "dummy_key":
                from openai import OpenAI
                self.client = OpenAI(api_key=api_key)
                logger.info("NLP Planner: OpenAI client initialized")
            else:
                logger.warning("NLP Planner: No OpenAI API key, using rule-based fallback")
        else:
            logger.info("NLP Planner: Local model mode (llama.cpp)")

    def parse_intent(self, user_command: str, video_context: Optional[dict] = None) -> dict:
        if self.client and not self.use_local_model:
            return self._parse_with_llm(user_command, video_context or {})
        return self._parse_rule_based(user_command)

    def _parse_with_llm(self, command: str, context: dict) -> dict:
        duration = context.get("duration", 60)
        registy_str = json.dumps(list(OPERATION_REGISTRY.keys()), indent=2)

        prompt = f"""You are VIDE's NLP planning engine.
User request: "{command}"
Video duration: {duration}s
Valid operations: {registy_str}

Output a JSON object with:
- plan_id (string)
- summary (string): brief description of what will be done
- operations (array of objects with "op" and "params" fields)

Only use operations from the valid list. Set params to empty dict if not applicable.
Respond with valid JSON only."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a video editing assistant that outputs JSON DAG plans."},
                    {"role": "user", "content": prompt}
                ]
            )
            result = json.loads(response.choices[0].message.content)
            logger.info(f"LLM plan generated: {result.get('plan_id', 'unknown')}")
            return result
        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            return self._parse_rule_based(command)

    def _parse_rule_based(self, command: str) -> dict:
        cmd_lower = command.lower()
        operations = []

        patterns = [
            (r"(?:trim|cut|remove)\s*(?:first\s*)?(\d+)\s*(?:seconds?|s)", lambda m: {
                "op": "trim", "params": {"start": 0, "end": int(m.group(1))}
            }),
            (r"(?:trim|cut)\s+from\s+(\d+)\s+to\s+(\d+)", lambda m: {
                "op": "trim", "params": {"start": int(m.group(1)), "end": int(m.group(2))}
            }),
            (r"fade\s*(?:in|out)?", lambda _: {
                "op": "fade_in", "params": {"duration_ms": 500}
            }),
            (r"crossfade|dissolve", lambda _: {
                "op": "crossfade", "params": {"duration_ms": 500}
            }),
            (r"(?:vintage|warm|cold|cinematic)\s*(?:lut|color|grade)?", lambda m: {
                "op": "color_grade", "params": {"lut": f"{m.group(0).split()[0]}_lut"}
            }),
            (r"brightness\s*(\d+)", lambda m: {
                "op": "brightness", "params": {"value": int(m.group(1)) / 100}
            }),
            (r"contrast\s*(\d+)", lambda m: {
                "op": "contrast", "params": {"value": int(m.group(1)) / 100}
            }),
            (r"saturation\s*(\d+)", lambda m: {
                "op": "saturation", "params": {"value": int(m.group(1)) / 100}
            }),
            (r"(?:denoise|clean|remove noise)", lambda _: {
                "op": "denoise_audio", "params": {"strength": 0.5}
            }),
            (r"(?:remove|delete)\s*(?:the\s*)?background", lambda _: {
                "op": "remove_background", "params": {}
            }),
            (r"(?:upscale|4k|hd|enhance)", lambda _: {
                "op": "upscale", "params": {"factor": 2}
            }),
            (r"slow.?mo(tion)?", lambda _: {
                "op": "slow_motion", "params": {"factor": 2}
            }),
            (r"stabilize", lambda _: {
                "op": "stabilize", "params": {"shakiness": 5}
            }),
            (r"export\s*(?:as\s*)?(720p|1080p|4k|4K)", lambda m: {
                "op": "export", "params": {"resolution": m.group(1), "codec": "h264", "crf": 18}
            }),
            (r"export", lambda _: {
                "op": "export", "params": {"resolution": "1080p", "codec": "h264", "crf": 18}
            }),
            (r"(?:subtitle|transcribe|caption)", lambda _: {
                "op": "transcribe", "params": {"language": "en"}
            }),
        ]

        for pattern, handler in patterns:
            match = re.search(pattern, cmd_lower)
            if match:
                operations.append(handler(match))

        if not operations:
            operations.append({
                "op": "export",
                "params": {"resolution": "1080p", "codec": "h264", "crf": 18}
            })

        ops_str = ", ".join(o["op"] for o in operations)
        return {
            "plan_id": f"plan_rule_{hash(command) % 100000:05d}",
            "summary": f"Applying: {ops_str}",
            "operations": operations
        }

class SAM2Worker:
    def process(self, video_frames, prompt_clicks):
        logger.info("SAM2 worker: processing frames")
        return {"masks": [], "status": "mock"}

class DeepFilterNetWorker:
    def process(self, audio_file):
        logger.info("DeepFilterNet worker: denoising audio")
        return {"output": audio_file, "status": "mock"}

class LaMaInpaintWorker:
    def process(self, video_frames, mask):
        logger.info("LaMa worker: inpainting frames")
        return {"output": "inpainted", "status": "mock"}
