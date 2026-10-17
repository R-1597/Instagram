# Instagram Clone Backend - Authentication and Post Access Tests
# Compatible with Windows PowerShell 5.1+
# This script does not print passwords or access tokens and does not delete posts.
# Run from any directory: .\test-post-access.ps1

$ErrorActionPreference = "Stop"

$BaseUrl = Read-Host "API base URL (press Enter for http://localhost:5000/api)"
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    $BaseUrl = "http://localhost:5000/api"
}
$BaseUrl = $BaseUrl.TrimEnd('/')

function Read-Account {
    param([string]$Label)

    Write-Host ""
    Write-Host "Enter $Label account credentials" -ForegroundColor Cyan
    $email = Read-Host "Email"
    $securePassword = Read-Host "Password" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }

    return [pscustomobject]@{
        Email = $email.Trim()
        Password = $plainPassword
        Token = $null
        UserId = $null
    }
}

function Get-PropertyValue {
    param(
        [object]$Object,
        [string[]]$Names
    )
    if ($null -eq $Object) { return $null }

    if ($Object -is [System.Collections.IDictionary]) {
        foreach ($name in $Names) {
            if ($Object.Contains($name) -and $null -ne $Object[$name] -and "$($Object[$name])" -ne "") {
                return $Object[$name]
            }
        }
        foreach ($key in $Object.Keys) {
            $found = Get-PropertyValue -Object $Object[$key] -Names $Names
            if ($null -ne $found) { return $found }
        }
    } elseif ($Object -is [pscustomobject]) {
        foreach ($name in $Names) {
            $prop = $Object.PSObject.Properties[$name]
            if ($null -ne $prop -and $null -ne $prop.Value -and "$($prop.Value)" -ne "") {
                return $prop.Value
            }
        }
        foreach ($prop in $Object.PSObject.Properties) {
            $found = Get-PropertyValue -Object $prop.Value -Names $Names
            if ($null -ne $found) { return $found }
        }
    } elseif ($Object -is [array]) {
        foreach ($item in $Object) {
            $found = Get-PropertyValue -Object $item -Names $Names
            if ($null -ne $found) { return $found }
        }
    }
    return $null
}

function Invoke-Api {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Path,
        [string]$Token,
        [object]$Body
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $uri = "$BaseUrl$Path"
    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        if ($null -ne $Body) {
            $params["ContentType"] = "application/json"
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
        $data = Invoke-RestMethod @params
        return [pscustomobject]@{ Status = 200; Data = $data; Error = $null }
    } catch {
        $status = 0
        $data = $null
        try {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $status = [int]$_.Exception.Response.StatusCode
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $raw = $reader.ReadToEnd()
                    $reader.Dispose()
                    if (-not [string]::IsNullOrWhiteSpace($raw)) {
                        try { $data = $raw | ConvertFrom-Json } catch { $data = $raw }
                    }
                }
            }
        } catch {}
        if ($status -eq 0) {
            return [pscustomobject]@{ Status = 0; Data = $data; Error = $_.Exception.Message }
        }
        return [pscustomobject]@{ Status = $status; Data = $data; Error = $null }
    }
}

$script:PassCount = 0
$script:FailCount = 0
$script:SkipCount = 0

function Check-Status {
    param(
        [string]$Name,
        [object]$Response,
        [int[]]$Expected
    )
    if ($Expected -contains [int]$Response.Status) {
        Write-Host ("PASS  {0} (HTTP {1})" -f $Name, $Response.Status) -ForegroundColor Green
        $script:PassCount++
    } else {
        Write-Host ("FAIL  {0} (expected HTTP {1}; got HTTP {2})" -f $Name, ($Expected -join " or "), $Response.Status) -ForegroundColor Red
        if ($Response.Error) { Write-Host ("      " + $Response.Error) -ForegroundColor DarkRed }
        elseif ($Response.Data) {
            $detail = $Response.Data | ConvertTo-Json -Depth 5 -Compress
            if ($detail.Length -gt 350) { $detail = $detail.Substring(0,350) + "..." }
            Write-Host ("      " + $detail) -ForegroundColor DarkRed
        }
        $script:FailCount++
    }
}

function Skip-Test {
    param([string]$Name, [string]$Reason)
    Write-Host ("SKIP  {0}: {1}" -f $Name, $Reason) -ForegroundColor Yellow
    $script:SkipCount++
}

function Get-PostsArray {
    param([object]$Data)
    if ($null -eq $Data) { return @() }
    $posts = Get-PropertyValue -Object $Data -Names @("posts")
    if ($null -ne $posts -and $posts -is [array]) { return @($posts) }
    # Some APIs return a single post object instead of a list.
    if ((Get-PropertyValue -Object $Data -Names @("_id", "id")) -and
        (Get-PropertyValue -Object $Data -Names @("caption")) -ne $null) {
        return @($Data)
    }
    return @()
}

Write-Host ""
Write-Host "Instagram Clone - authentication and post access test" -ForegroundColor Cyan
Write-Host "API: $BaseUrl"
Write-Host "Use two different existing accounts to test cross-user access."
$accountA = Read-Account -Label "Account A (primary)"
$accountB = Read-Account -Label "Account B (another user)"

# Login both accounts and extract tokens/user IDs from common response shapes.
$loginA = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email = $accountA.Email
    password = $accountA.Password
}
Check-Status -Name "Account A login" -Response $loginA -Expected @(200)

if ($loginA.Status -eq 200) {
    $accountA.Token = Get-PropertyValue -Object $loginA.Data -Names @("accessToken", "token")
    $accountA.UserId = Get-PropertyValue -Object $loginA.Data -Names @("userId", "_id", "id")
}
$accountA.Password = $null

$loginB = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email = $accountB.Email
    password = $accountB.Password
}
Check-Status -Name "Account B login" -Response $loginB -Expected @(200)

if ($loginB.Status -eq 200) {
    $accountB.Token = Get-PropertyValue -Object $loginB.Data -Names @("accessToken", "token")
    $accountB.UserId = Get-PropertyValue -Object $loginB.Data -Names @("userId", "_id", "id")
}
$accountB.Password = $null

if (-not $accountA.Token -or -not $accountB.Token) {
    Write-Host ""
    Write-Host "Could not extract one or both JWT tokens from the login response." -ForegroundColor Red
    Write-Host "The login response must contain token/accessToken. Update the extraction names in the script to match your API."
    Write-Host ("Account A response: " + ($loginA.Data | ConvertTo-Json -Depth 6 -Compress))
    Write-Host ("Account B response: " + ($loginB.Data | ConvertTo-Json -Depth 6 -Compress))
    Write-Host ""
    Write-Host ("Summary: {0} passed, {1} failed, {2} skipped." -f $script:PassCount, ($script:FailCount + 1), $script:SkipCount)
    exit 1
}

# If login response didn't expose user IDs, ask for them. These are not secrets.
if (-not $accountA.UserId) { $accountA.UserId = Read-Host "Enter Account A user ID (from your database/profile)" }
if (-not $accountB.UserId) { $accountB.UserId = Read-Host "Enter Account B user ID (from your database/profile)" }

if ($accountA.UserId -eq $accountB.UserId) {
    Write-Host "WARNING: both accounts resolved to the same user ID. Cross-user tests may be invalid." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "---- Feed access ----" -ForegroundColor Cyan
$anonFeed = Invoke-Api -Method "GET" -Path "/posts/feed?page=1&limit=10"
Check-Status -Name "Guest cannot access home feed" -Response $anonFeed -Expected @(401,403)

$feedA = Invoke-Api -Method "GET" -Path "/posts/feed?page=1&limit=10" -Token $accountA.Token
Check-Status -Name "Logged-in Account A can access home feed" -Response $feedA -Expected @(200)

$feedB = Invoke-Api -Method "GET" -Path "/posts/feed?page=1&limit=10" -Token $accountB.Token
Check-Status -Name "Logged-in Account B can access home feed" -Response $feedB -Expected @(200)

Write-Host ""
Write-Host "---- Personal and other-user post access ----" -ForegroundColor Cyan
$anonOwnA = Invoke-Api -Method "GET" -Path "/posts/user/$($accountA.UserId)?page=1&limit=10"
Check-Status -Name "Guest cannot access Account A posts" -Response $anonOwnA -Expected @(401,403)

$anonOtherB = Invoke-Api -Method "GET" -Path "/posts/user/$($accountB.UserId)?page=1&limit=10"
Check-Status -Name "Guest cannot access Account B posts" -Response $anonOtherB -Expected @(401,403)

$ownA = Invoke-Api -Method "GET" -Path "/posts/user/$($accountA.UserId)?page=1&limit=10" -Token $accountA.Token
Check-Status -Name "Account A can access own posts" -Response $ownA -Expected @(200)

$otherBFromA = Invoke-Api -Method "GET" -Path "/posts/user/$($accountB.UserId)?page=1&limit=10" -Token $accountA.Token
Check-Status -Name "Account A can access Account B posts (authenticated access policy)" -Response $otherBFromA -Expected @(200)

$ownB = Invoke-Api -Method "GET" -Path "/posts/user/$($accountB.UserId)?page=1&limit=10" -Token $accountB.Token
Check-Status -Name "Account B can access own posts" -Response $ownB -Expected @(200)

# Find a post authored by B from B's own listing/feed, for optional safe read-only ownership setup.
$postsB = Get-PostsArray -Data $ownB.Data
if ($postsB.Count -eq 0) { $postsB = Get-PostsArray -Data $feedB.Data }
$postBId = $null
foreach ($post in $postsB) {
    $candidateId = Get-PropertyValue -Object $post -Names @("_id", "id")
    if ($candidateId) { $postBId = "$candidateId"; break }
}

Write-Host ""
Write-Host "---- Individual post access ----" -ForegroundColor Cyan
if ($postBId) {
    $anonSingleB = Invoke-Api -Method "GET" -Path "/posts/$postBId"
    Check-Status -Name "Guest cannot access an individual post" -Response $anonSingleB -Expected @(401,403)

    $singleBFromA = Invoke-Api -Method "GET" -Path "/posts/$postBId" -Token $accountA.Token
    Check-Status -Name "Account A can read Account B individual post (authenticated access policy)" -Response $singleBFromA -Expected @(200)

    $singleBFromB = Invoke-Api -Method "GET" -Path "/posts/$postBId" -Token $accountB.Token
    Check-Status -Name "Account B can read own individual post" -Response $singleBFromB -Expected @(200)
} else {
    Skip-Test -Name "Individual post access tests" -Reason "No post ID found in Account B's posts or feed. Create a post for Account B and rerun."
}

Write-Host ""
Write-Host "---- Post ownership mutation tests ----" -ForegroundColor Cyan
Skip-Test -Name "Edit own post / reject editing another user's post" -Reason "The available project context confirms create/delete routes but does not confirm an edit route or its HTTP method. This script intentionally avoids PATCH/PUT/DELETE requests until the exact route is known, so a buggy authorization check cannot accidentally alter/delete another user's post."

Write-Host ""
Write-Host "================ TEST SUMMARY ================" -ForegroundColor Cyan
Write-Host ("Passed : {0}" -f $script:PassCount) -ForegroundColor Green
Write-Host ("Failed : {0}" -f $script:FailCount) -ForegroundColor Red
Write-Host ("Skipped: {0}" -f $script:SkipCount) -ForegroundColor Yellow
if ($script:FailCount -gt 0) {
    Write-Host "Result: SOME TESTS FAILED. Review the status codes and backend route middleware." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Result: All executed tests passed. Review skipped tests before calling the full access-control suite complete." -ForegroundColor Green
    exit 0
}
