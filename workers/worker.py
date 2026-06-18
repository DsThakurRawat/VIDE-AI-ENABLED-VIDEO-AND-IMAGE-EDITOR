import os
import json
import logging
import signal
import sys

from redis import Redis
from rq import Worker, Queue

from tasks import (
    run_proxy_generation, run_trim, run_concat, run_transition,
    run_scene_detection, run_stabilize, run_speed_change,
    run_extract_audio, run_export, execute_dag, get_media_info
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

QUEUE_NAMES = {
    "default": "vide_default",
    "preview": "vide_preview",
    "export": "vide_export",
    "ai": "vide_ai",
}

TASK_MAP = {
    "proxy": run_proxy_generation,
    "trim": run_trim,
    "concat": run_concat,
    "transition": run_transition,
    "scene_detect": run_scene_detection,
    "stabilize": run_stabilize,
    "speed": run_speed_change,
    "extract_audio": run_extract_audio,
    "export": run_export,
    "execute_dag": execute_dag,
    "media_info": get_media_info,
}

def process_job(job_data: dict) -> dict:
    task_type = job_data.get("type", "")
    params = job_data.get("params", {})
    logger.info(f"Processing job type={task_type}")

    handler = TASK_MAP.get(task_type)
    if not handler:
        return {"status": "error", "error": f"unknown task type: {task_type}"}

    try:
        result = handler(**params)
        if result is None:
            return {"status": "error", "error": "handler returned None"}
        return json.loads(result) if isinstance(result, str) else result
    except Exception as e:
        logger.error(f"Job failed: {e}")
        return {"status": "error", "error": str(e)}

def main():
    queue_name = sys.argv[1] if len(sys.argv) > 1 else "default"
    q_name = QUEUE_NAMES.get(queue_name, queue_name)

    redis_conn = Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)
    queue = Queue(q_name, connection=redis_conn)
    worker = Worker([queue], connection=redis_conn)

    def handle_signal(sig, frame):
        logger.info("Shutting down worker...")
        worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    logger.info(f"VIDE worker started on queue '{q_name}' (Redis: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB})")
    worker.work()

if __name__ == "__main__":
    main()
