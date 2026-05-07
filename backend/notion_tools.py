from notion_client import Client
import os
from dotenv import load_dotenv

load_dotenv()

notion = Client(auth=os.getenv("NOTION_TOKEN"))

DATABASE_ID = os.getenv("NOTION_DATABASE_ID")


def create_notion_page(title: str, content: str, user_id: str):
    try:

        response = notion.pages.create(
            parent={"database_id": DATABASE_ID},

            properties={
                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": title
                            }
                        }
                    ]
                }
            },

            children=[
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": content
                                }
                            }
                        ]
                    }
                }
            ]
        )

        return {
            "status": "success",
            "page_id": response["id"],
            "url": response["url"]
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }