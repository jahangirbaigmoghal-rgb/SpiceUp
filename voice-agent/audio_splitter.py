"""Decodes stereo OGG audio files and splits them into mono/stereo WAVs."""

import os
import logging
import wave
import av
import numpy as np

logger = logging.getLogger(__name__)


def split_stereo_ogg(
    input_path: str,
    user_path: str,
    agent_path: str,
    stereo_path: str,
    target_sample_rate: int = 16000
) -> bool:
    """Decode a stereo OGG file and split it into user (left channel), agent (right channel), and stereo WAV files.

    Args:
        input_path: Path to the input stereo OGG file.
        user_path: Output path for the user/caller mono WAV.
        agent_path: Output path for the agent mono WAV.
        stereo_path: Output path for the combined stereo WAV.
        target_sample_rate: Desired sample rate for output WAVs (default 16000).

    Returns:
        True if split succeeded, False otherwise.
    """
    if not os.path.exists(input_path):
        logger.error("Input file does not exist: %s", input_path)
        return False

    container = None
    w_user = None
    w_agent = None
    w_stereo = None

    try:
        container = av.open(input_path)
        if not container.streams.audio:
            logger.error("No audio streams found in input file %s", input_path)
            return False

        stream = container.streams.audio[0]

        # Open WAV output files
        w_user = wave.open(user_path, "wb")
        w_user.setnchannels(1)
        w_user.setsampwidth(2)  # 16-bit PCM
        w_user.setframerate(target_sample_rate)

        w_agent = wave.open(agent_path, "wb")
        w_agent.setnchannels(1)
        w_agent.setsampwidth(2)
        w_agent.setframerate(target_sample_rate)

        w_stereo = wave.open(stereo_path, "wb")
        w_stereo.setnchannels(2)
        w_stereo.setsampwidth(2)
        w_stereo.setframerate(target_sample_rate)

        # Setup audio resampler to pack samples as interleaved 16-bit signed stereo
        resampler = av.AudioResampler(
            format="s16",
            layout="stereo",
            rate=target_sample_rate
        )

        for frame in container.decode(stream):
            # Resample frame to target layout/rate
            resampled_frames = resampler.resample(frame)
            if not resampled_frames:
                continue

            for r_frame in resampled_frames:
                # Interleaved stereo bytes
                data = r_frame.planes[0].to_bytes()
                w_stereo.writeframes(data)

                # Split left/right channels using numpy
                samples = np.frombuffer(data, dtype=np.int16)
                if len(samples) > 0:
                    left_samples = samples[0::2]
                    right_samples = samples[1::2]
                    w_user.writeframes(left_samples.tobytes())
                    w_agent.writeframes(right_samples.tobytes())

        logger.info("Successfully split stereo OGG file %s to mono/stereo WAVs", input_path)
        return True

    except Exception as e:
        logger.error("Failed to split stereo OGG file %s: %s", input_path, e)
        return False

    finally:
        # Clean up handlers
        if w_user:
            try:
                w_user.close()
            except Exception:
                pass
        if w_agent:
            try:
                w_agent.close()
            except Exception:
                pass
        if w_stereo:
            try:
                w_stereo.close()
            except Exception:
                pass
        if container:
            try:
                container.close()
            except Exception:
                pass
