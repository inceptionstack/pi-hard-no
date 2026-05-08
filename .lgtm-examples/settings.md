# Example: Settings

Place this file at `.lgtm/settings.json` in your project root.

```json
{
  "maxReviewLoops": 100,
  "model": "amazon-bedrock/us.anthropic.claude-sonnet-4-6"
}
```

## Settings reference

| Setting          | Type        | Default                                         | Description                                  |
| ---------------- | ----------- | ----------------------------------------------- | -------------------------------------------- |
| `maxReviewLoops` | integer > 0 | 100                                             | Max review→fix→review cycles before stopping |
| `model`          | string      | `amazon-bedrock/us.anthropic.claude-sonnet-4-6` | Reviewer model in `provider/model-id` format |
