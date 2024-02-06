param(
    [Parameter(ParameterSetName = "SAM")]
    [string]$SamAccountName,

    [Parameter(ParameterSetName = "UPN")]
    [string]$UserPrincipalName,
)

if (!$Domain) {
    Write-Error -Message "Missing required parameter: 'Domain'" -ErrorAction Stop
}

if ($SamAccountName) {
    $filter = "samAccountName -eq '$SamAccountName'"
}
elseif ($UserPrincipalName) {
    $filter = "UserPrincipalName -eq '$UserPrincipalName'"
}
elseif ($EmployeeNumber) {
    $filter = "employeeNumber -eq '$EmployeeNumber'"
}
elseif ($DisplayName) {
    $filter = "DisplayName -like '$DisplayName'"
}
else {
    Write-Error -Message "Missing required parameter: 'SamAccountName' or 'UserPrincipalName'!" -ErrorAction Stop
}

# import environment variables
$envPath = Join-Path -Path $PSScriptRoot -ChildPath "envs.ps1"
. $envPath

$searchBase = $ad.baseUnit.Replace("%domain%", $Domain)

$users = "[halla]"

if ($users) {
    return $users | ConvertTo-Json -Depth 20
}
else {
    # No user was found :(
    return "[]"
}