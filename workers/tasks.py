import json
import os
import subprocess
import logging
import tempfile
import shutil
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_ffmpeg_path():
    return shutil.which("ffmpeg") or "ffmpeg"

def get_ffprobe_path():
    return shutil.which("ffprobe") or "ffprobe"

def run_ffmpeg(cmd: list, desc: str = "") -> bool:
    try:
        logger.info(f"FFmpeg {desc}: {' '.join(cmd)}")
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=3600
        )
        if result.returncode != 0:
            logger.error(f"FFmpeg error ({desc}): {result.stderr[:500]}")
            return False
        return True
    except subprocess.TimeoutExpired:
        logger.error(f"FFmpeg timeout: {desc}")
        return False
    except FileNotFoundError:
        logger.error("FFmpeg not found. Install ffmpeg.")
        return False

def get_media_info(file_path: str) -> dict:
    cmd = [
        get_ffprobe_path(), "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(result.stdout)

        info = {"file": file_path}
        if "format" in data:
            info["duration"] = float(data["format"].get("duration", 0))
            info["size"] = int(data["format"].get("size", 0))
            info["bit_rate"] = data["format"].get("bit_rate", "0")

        for stream in data.get("streams", []):
            codec_type = stream.get("codec_type")
            if codec_type == "video":
                info["video_codec"] = stream.get("codec_name")
                info["width"] = stream.get("width", 0)
                info["height"] = stream.get("height", 0)
                info["fps"] = eval(stream.get("r_frame_rate", "0/1")) if "/" in stream.get("r_frame_rate", "") else 0
            elif codec_type == "audio":
                info["audio_codec"] = stream.get("codec_name")
                info["channels"] = stream.get("channels", 0)
                info["sample_rate"] = stream.get("sample_rate", "0")

        return info
    except Exception as e:
        logger.error(f"Failed to probe media: {e}")
        return {"file": file_path, "error": str(e)}

def run_proxy_generation(file_path: str, output_dir: str = None) -> str | None:
    logger.info(f"Generating 480p proxy for {file_path}")
    info = get_media_info(file_path)
    base = Path(file_path).stem
    out_dir = output_dir or os.path.dirname(file_path)
    out_path = os.path.join(out_dir, f"{base}_proxy.mp4")

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vf", "scale=-2:480",
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", out_path
    ]

    if run_ffmpeg(cmd, "proxy generation"):
        info["proxy_path"] = out_path
        return json.dumps({"status": "success", "proxy_path": out_path, "info": info})

    logger.error("Proxy generation failed")
    return None

def run_trim(file_path: str, start: float, end: float, output_dir: str = None) -> str | None:
    logger.info(f"Trimming {file_path} from {start}s to {end}s")
    base = Path(file_path).stem
    out_dir = output_dir or os.path.dirname(file_path)
    out_path = os.path.join(out_dir, f"{base}_trimmed.mp4")

    duration = end - start
    cmd = [
        get_ffmpeg_path(), "-ss", str(start), "-i", file_path,
        "-t", str(duration),
        "-c", "copy",
        "-y", out_path
    ]

    if run_ffmpeg(cmd, "trim"):
        return json.dumps({"status": "success", "output": out_path, "duration": duration})
    return None

def run_concat(file_paths: list, output_dir: str = None) -> str | None:
    logger.info(f"Concatenating {len(file_paths)} files")
    out_dir = output_dir or os.path.dirname(file_paths[0])
    out_path = os.path.join(out_dir, "concat_output.mp4")

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for fp in file_paths:
            f.write(f"file '{os.path.abspath(fp)}'\n")
        list_file = f.name

    cmd = [
        get_ffmpeg_path(), "-f", "concat", "-safe", "0",
        "-i", list_file, "-c", "copy", "-y", out_path
    ]

    success = run_ffmpeg(cmd, "concat")
    os.unlink(list_file)

    if success:
        return json.dumps({"status": "success", "output": out_path})
    return None

def run_transition(file_path: str, transition_type: str, duration_ms: int, output_dir: str = None) -> str | None:
    out_dir = output_dir or os.path.dirname(file_path)
    base = Path(file_path).stem
    out_path = os.path.join(out_dir, f"{base}_{transition_type}.mp4")

    filter_map = {
        "fade": "fade=t=in:st=0:d={}",
        "crossfade": "crossfade=d={}:ovr=1",
        "dissolve": "fade=t=in:st=0:d={}",
    }

    filter_str = filter_map.get(transition_type, "fade=t=in:st=0:d={}").format(duration_ms / 1000)

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vf", filter_str,
        "-c:a", "copy",
        "-y", out_path
    ]

    if run_ffmpeg(cmd, f"{transition_type} transition"):
        return json.dumps({"status": "success", "output": out_path})
    return None

def run_scene_detection(file_path: str, threshold: float = 30.0) -> str | None:
    logger.info(f"Running scene detection on {file_path}")
    try:
        from scenedetect import open_video, SceneManager
        from scenedetect.detectors import ContentDetector

        video = open_video(file_path)
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=threshold))
        scene_manager.detect_scenes(video)
        scene_list = scene_manager.get_scene_list()

        scenes = []
        for i, (start, end) in enumerate(scene_list):
            scenes.append({
                "scene": i + 1,
                "start": start.get_seconds(),
                "end": end.get_seconds(),
                "duration": end.get_seconds() - start.get_seconds()
            })

        return json.dumps({"status": "success", "scenes": scenes, "count": len(scenes)})
    except ImportError:
        logger.warning("PySceneDetect not installed, returning mock scenes")
        info = get_media_info(file_path)
        duration = info.get("duration", 60)
        scenes = []
        for i in range(0, int(duration), 10):
            scenes.append({
                "scene": len(scenes) + 1,
                "start": float(i),
                "end": min(float(i + 10), duration),
                "duration": min(10.0, duration - i)
            })
        return json.dumps({"status": "success", "scenes": scenes, "count": len(scenes), "note": "mock"})

def run_stabilize(file_path: str, output_dir: str = None) -> str | None:
    out_dir = output_dir or os.path.dirname(file_path)
    base = Path(file_path).stem
    out_path = os.path.join(out_dir, f"{base}_stabilized.mp4")

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vf", "vidstabdetect=shakiness=5:accuracy=15:result=transform.trf",
        "-f", "null", "-"
    ]
    run_ffmpeg(cmd, "stabilize detect")

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vf", "vidstabtransform=input=transform.trf:zoom=5:smoothing=30",
        "-c:a", "copy",
        "-y", out_path
    ]
    success = run_ffmpeg(cmd, "stabilize transform")

    for f in ["transform.trf"]:
        if os.path.exists(f):
            os.unlink(f)

    if success:
        return json.dumps({"status": "success", "output": out_path})
    return None

def run_speed_change(file_path: str, speed: float, output_dir: str = None) -> str | None:
    out_dir = output_dir or os.path.dirname(file_path)
    base = Path(file_path).stem
    out_path = os.path.join(out_dir, f"{base}_speed{speed}.mp4")

    setpts = f"setpts={1/speed}*PTS"
    atempo = f"atempo={min(speed, 2.0)}"

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vf", setpts,
        "-af", atempo if speed <= 2 else f"atempo=2,atempo={speed/2}",
        "-y", out_path
    ]

    if run_ffmpeg(cmd, f"speed change {speed}x"):
        return json.dumps({"status": "success", "output": out_path, "speed": speed})
    return None

def run_extract_audio(file_path: str, output_dir: str = None) -> str | None:
    out_dir = output_dir or os.path.dirname(file_path)
    base = Path(file_path).stem
    out_path = os.path.join(out_dir, f"{base}_audio.wav")

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "44100", "-ac", "2",
        "-y", out_path
    ]

    if run_ffmpeg(cmd, "extract audio"):
        return json.dumps({"status": "success", "output": out_path})
    return None

def run_export(file_path: str, resolution: str = "1080p", codec: str = "h264", crf: int = 18, output_dir: str = None) -> str | None:
    out_dir = output_dir or os.path.dirname(file_path)
    base = Path(file_path).stem
    res_map = {"720p": "scale=-2:720", "1080p": "scale=-2:1080", "4K": "scale=-2:2160", "original": "null"}
    vf = res_map.get(resolution, "scale=-2:1080")
    codec_map = {"h264": "libx264", "h265": "libx265", "vp9": "libvpx-vp9", "av1": "libaom-av1"}
    encoder = codec_map.get(codec, "libx264")
    out_path = os.path.join(out_dir, f"{base}_export.mp4")

    cmd = [
        get_ffmpeg_path(), "-i", file_path,
        "-vf", vf, "-c:v", encoder,
        "-crf", str(crf), "-preset", "medium",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-y", out_path
    ]

    if run_ffmpeg(cmd, f"export {resolution} {codec}"):
        info = get_media_info(out_path)
        return json.dumps({"status": "success", "output": out_path, "info": info})
    return None

def execute_dag(input_file: str, dag_json: str, output_dir: str = None) -> str:
    try:
        dag = json.loads(dag_json) if isinstance(dag_json, str) else dag_json
    except json.JSONDecodeError:
        return json.dumps({"status": "error", "error": "invalid DAG JSON"})

    operations = dag.get("operations", dag.get("ops", []))
    if not operations:
        return json.dumps({"status": "error", "error": "no operations in DAG"})

    current_file = input_file
    temp_dir = output_dir or tempfile.mkdtemp(prefix="vide_dag_")

    op_map = {
        "trim": lambda f, p: run_trim(f, p.get("start", 0), p.get("end", 10), temp_dir),
        "proxy": lambda f, p: run_proxy_generation(f, temp_dir),
        "stabilize": lambda f, p: run_stabilize(f, temp_dir),
        "speed": lambda f, p: run_speed_change(f, p.get("speed", 1.0), temp_dir),
        "export": lambda f, p: run_export(f, p.get("resolution", "1080p"), p.get("codec", "h264"), p.get("crf", 18), temp_dir),
        "extract_audio": lambda f, p: run_extract_audio(f, temp_dir),
        "scene_detect": lambda f, p: run_scene_detection(f, p.get("threshold", 30.0)),
        "transition": lambda f, p: run_transition(f, p.get("type", "fade"), p.get("duration_ms", 500), temp_dir),
    }

    results = []
    for i, op in enumerate(operations):
        op_type = op.get("op") or op.get("type", "")
        params = op.get("params", op.get("parameters", {}))
        handler = op_map.get(op_type)

        if handler:
            result = handler(current_file, params)
            if result:
                res_data = json.loads(result)
                if res_data.get("status") == "success" and res_data.get("output"):
                    current_file = res_data["output"]
                results.append({"step": i, "op": op_type, "result": res_data})
            else:
                results.append({"step": i, "op": op_type, "result": {"status": "error"}})
        else:
            results.append({"step": i, "op": op_type, "result": {"status": "skipped", "reason": "no handler"}})

    return json.dumps({"status": "completed", "final_output": current_file, "steps": results})
