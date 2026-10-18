$base = "http://localhost:5000/api"
$token = Read-Host "Paste your JWT access token"
$postId = Read-Host "Enter a valid post ID"

$headers = @{
    Authorization = "Bearer $token"
}

$body = @{
    text = "Testing comments in Stage 13."
} | ConvertTo-Json

# Create a comment
$comment = Invoke-RestMethod `
    -Uri "$base/posts/$postId/comments" `
    -Method POST `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body

$comment | ConvertTo-Json -Depth 10

# Retrieve comments
Invoke-RestMethod `
    -Uri "$base/posts/$postId/comments?page=1&limit=20" `
    -Headers $headers |
    ConvertTo-Json -Depth 10