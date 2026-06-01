"""S3/R2 file storage module for call recordings."""

import os
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Retrieve environment variables
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL")


def is_s3_configured() -> bool:
    """Check if minimum required S3 settings are present."""
    return bool(S3_BUCKET_NAME and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)


def get_s3_client():
    """Create and return a boto3 S3 client."""
    if not is_s3_configured():
        return None

    client_kwargs = {
        "aws_access_key_id": AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
        "region_name": AWS_REGION,
    }

    if S3_ENDPOINT_URL:
        client_kwargs["endpoint_url"] = S3_ENDPOINT_URL

    return boto3.client("s3", **client_kwargs)


def upload_to_s3(data: bytes, object_name: str, content_type: str = "audio/wav") -> bool:
    """Upload byte data to S3.

    Args:
        data: Byte content of the file.
        object_name: S3 key/object name.
        content_type: Content-Type metadata for the file.

    Returns:
        True if upload succeeded, False otherwise.
    """
    s3_client = get_s3_client()
    if not s3_client:
        logger.warning("S3 not configured — skipping upload for %s", object_name)
        return False

    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=object_name,
            Body=data,
            ContentType=content_type
        )
        logger.info("Successfully uploaded %s to S3 bucket %s", object_name, S3_BUCKET_NAME)
        return True
    except ClientError as e:
        logger.error("Failed to upload %s to S3: %s", object_name, e)
        return False
    except Exception as e:
        logger.error("Unexpected error uploading %s to S3: %s", object_name, e)
        return False


def delete_from_s3(object_name: str) -> bool:
    """Delete an object from S3.

    Args:
        object_name: S3 key/object name to delete.

    Returns:
        True if deletion succeeded, False otherwise.
    """
    s3_client = get_s3_client()
    if not s3_client:
        logger.warning("S3 not configured — skipping delete for %s", object_name)
        return False

    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=object_name)
        logger.info("Successfully deleted %s from S3 bucket %s", object_name, S3_BUCKET_NAME)
        return True
    except ClientError as e:
        logger.error("Failed to delete %s from S3: %s", object_name, e)
        return False
    except Exception as e:
        logger.error("Unexpected error deleting %s from S3: %s", object_name, e)
        return False
