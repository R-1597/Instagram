
# Stage 9: Post Ownership Authorization Test
# Run from PowerShell 5.1

$baseUrl = "http://localhost:5000/api"

Write-Host "`n=== Stage 9: Post Ownership Tests ===" -ForegroundColor Cyan

# Login helper: gets a fresh JWT without displaying it
function Get-LoginToken {
    param (
        [string]$Email,
        [string]$Password
    )

    $body = @{
        email    = $Email
        password = $Password
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    if ($response.token) { return $response.token }
    if ($response.accessToken) { return $response.accessToken }
    if ($response.data.token) { return $response.data.token }
    if ($response.data.accessToken) { return $response.data.accessToken }

    throw "JWT not found in login response. Check your login response structure."
}

# Enter credentials for two existing test accounts
$emailA = Read-Host "User A email"
$passwordA = Read-Host "User A password" -AsSecureString
$emailB = Read-Host "User B email"
$passwordB = Read-Host "User B password" -AsSecureString

function Convert-SecureToPlainText {
    param ([System.Security.SecureString]$SecureValue)

    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

try {
    $plainA = Convert-SecureToPlainText $passwordA
    $plainB = Convert-SecureToPlainText $passwordB

    $tokenA = Get-LoginToken -Email $emailA -Password $plainA
    $tokenB = Get-LoginToken -Email $emailB -Password $plainB

    Write-Host "`nPASS: Both users logged in and received fresh tokens." -ForegroundColor Green

    # User A creates a disposable post through the existing test script
    Write-Host "`nCreate a disposable post while logged in as User A." -ForegroundColor Yellow
    $postId = Read-Host "Enter the ID of User A's disposable test post"

    if ($postId -notmatch '^[a-fA-F0-9]{24}$') {
        throw "Invalid MongoDB post ID."
    }

    # Verify User A can edit their own post
    $headersA = @{ Authorization = "Bearer $tokenA" }
    $headersB = @{ Authorization = "Bearer $tokenB" }

    $original = Invoke-RestMethod `
        -Uri "$baseUrl/posts/$postId" `
        -Method GET

    $originalCaption = $original.post.caption

    $ownerCaption = "Stage 9 owner edit test"
    $ownerBody = @{ caption = $ownerCaption } | ConvertTo-Json

    $ownerResult = Invoke-RestMethod `
        -Uri "$baseUrl/posts/$postId" `
        -Method PATCH `
        -Headers $headersA `
        -ContentType "application/json" `
        -Body $ownerBody

    if ($ownerResult.success -and $ownerResult.post.caption -eq $ownerCaption) {
        Write-Host "PASS: User A can edit their own post." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: User A could not edit their own post." -ForegroundColor Red
    }

    # User B attempts to edit User A's post
    $attackerBody = @{
        caption = "Unauthorized edit attempt"
    } | ConvertTo-Json

    try {
        $null = Invoke-RestMethod `
            -Uri "$baseUrl/posts/$postId" `
            -Method PATCH `
            -Headers $headersB `
            -ContentType "application/json" `
            -Body $attackerBody

        Write-Host "FAIL: User B was able to edit User A's post!" -ForegroundColor Red
    }
    catch {
        $status = [int]$_.Exception.Response.StatusCode

        if ($status -eq 404) {
            Write-Host "PASS: User B cannot edit User A's post (404)." -ForegroundColor Green
        }
        else {
            Write-Host "FAIL: Edit attempt returned HTTP $status; expected 404." -ForegroundColor Red
        }
    }

    # Verify the caption has not been changed by User B
    $check = Invoke-RestMethod `
        -Uri "$baseUrl/posts/$postId" `
        -Method GET

    if ($check.post.caption -eq $ownerCaption) {
        Write-Host "PASS: Post caption remained unchanged after User B's edit attempt." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Caption changed unexpectedly." -ForegroundColor Red
    }

    # User B attempts to delete User A's post
    try {
        $null = Invoke-RestMethod `
            -Uri "$baseUrl/posts/$postId" `
            -Method DELETE `
            -Headers $headersB

        Write-Host "FAIL: User B was able to delete User A's post!" -ForegroundColor Red
    }
    catch {
        $status = [int]$_.Exception.Response.StatusCode

        if ($status -eq 404) {
            Write-Host "PASS: User B cannot delete User A's post (404)." -ForegroundColor Green
        }
        else {
            Write-Host "FAIL: Delete attempt returned HTTP $status; expected 404." -ForegroundColor Red
        }
    }

    # Confirm the post still exists
    $finalCheck = Invoke-RestMethod `
        -Uri "$baseUrl/posts/$postId" `
        -Method GET

    if ($finalCheck.post._id -eq $postId) {
        Write-Host "PASS: User A's post still exists." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Could not verify the post." -ForegroundColor Red
    }

    Write-Host "`n=== Ownership Tests Finished ===" -ForegroundColor Cyan
}
catch {
    Write-Host "`nTEST ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the server, login endpoint, credentials, and response structure."
}
finally {
    $plainA = $null
    $plainB = $null
    $tokenA = $null
    $tokenB = $null
}
