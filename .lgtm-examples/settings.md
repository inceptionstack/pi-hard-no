# Example: Settings

Place this file at `.lgtm/settings.json` in your project root.

```json
{
  "maxReviewLoops": 100,
  "model": "amazon-bedrock/us.meta.llama4-maverick-17b-instruct-v1:0"
}
```

## Settings reference

| Setting          | Type        | Default                                                    | Description                                  |
| ---------------- | ----------- | ---------------------------------------------------------- | -------------------------------------------- |
| `maxReviewLoops` | integer > 0 | 100                                                        | Max review→fix→review cycles before stopping |
| `model`          | string      | `amazon-bedrock/us.meta.llama4-maverick-17b-instruct-v1:0` | Reviewer model in `provider/model-id` format |
