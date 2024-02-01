Function GetADUser {
    param(
        [ValidateSet("login.top.no","skole.top.no")]
        [Parameter(Mandatory = $true)]
        [String] $Domain,

        [ValidateSet("VTFK", "VFYLKE", "TFYLKE")]
        [String] $OU = "VTFK",

        [String] $Filter = "*",

        [String[]] $Properties = "*",

        [ValidateSet("USERS", "USERS APPRENTICE", "USERS OT")]
        [String] $Base = "USERS",

        [Switch] $OnlyAutoUsers,

        [Switch] $OnlyDisabledAutoUsers
    )

    $SearchBase = "OU=$Base,OU=$OU,DC=$($Domain.ToUpper().Split(".") -join ",DC=")"

    if($OnlyAutoUsers) 
    {
        $SearchBase = "OU=AUTO USERS,$SearchBase"
    }
    elseif ($OnlyDisabledAutoUsers)
    {
        $SearchBase = "OU=AUTO DISABLED USERS,$SearchBase"
    }

    return Get-ADUser -Server $Domain -Filter $Filter -SearchBase $SearchBase -Properties $Properties
}


Function Update-DUSTADUsers {
    $filterVekkExt14 = "TFK"
    $countyOU = "VFYLKE"

    $adUsers = @()
    Write-Host "Starting AD Users : $(Get-Date -Format 'HH:mm:ss')" -Verbose

    # get ad VTFK users from AUTO USERS
    Write-Host "Finding 'AUTO USERS' from login.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Ansatt VTFK
    $adUsers += GetADUser -Domain "login.top.no" -Filter "extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Properties memberOf,givenName,sn,displayName,employeeNumber,extensionAttribute4,extensionAttribute6,extensionAttribute7,extensionAttribute9,extensionAttribute14,company,physicalDeliveryOfficeName,mail,proxyAddresses,title,state -OnlyAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="type"; E={"ansattVTFK"}}, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"login"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO USERS"}}, extensionAttribute7, extensionAttribute9, extensionAttribute14, @{N="departmentShort"; E={$_.extensionAttribute6}}, @{N="departmentAdditional"; E={$_.extensionAttribute4}}, @{N="office"; E={$_.physicalDeliveryOfficeName}}, @{N="company"; E={$_.company}}, title, state, @{N="feide"; E={if ($_.memberOf -like "*VT-ALLE-LÆRERE*") {$True} else {$False}}}
    # Elever VTFK
    Write-Host "Finding 'AUTO USERS' from skole.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    $adUsers += GetADUser -Domain "skole.top.no" -Filter "Title -eq 'Elev' -and extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Properties givenName,sn,displayName,employeeNumber,department,company,mail,proxyAddresses,title -OnlyAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"skole"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO USERS"}}, @{N="departmentShort"; E={$_.department}}, @{N="office"; E={$_.company}}, @{N="company"; E={$_.company}}, title

    # get ad XFYLKE users from AUTO USERS
    Write-Host "Finding 'AUTO USERS' from login.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Ansatt XFYLKE
    $adUsers += GetADUser -Domain "login.top.no" -OU $countyOU -Filter "*" -Properties memberOf,givenName,sn,displayName,employeeNumber,extensionAttribute4,extensionAttribute6,extensionAttribute7,extensionAttribute9,extensionAttribute14,company,physicalDeliveryOfficeName,mail,proxyAddresses,title,state -OnlyAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"login"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={$countyOU}}, @{N="ou"; E={"AUTO USERS"}}, extensionAttribute7, extensionAttribute9, extensionAttribute14, @{N="departmentShort"; E={$_.extensionAttribute6}}, @{N="departmentAdditional"; E={$_.extensionAttribute4}}, @{N="office"; E={$_.physicalDeliveryOfficeName}}, @{N="company"; E={$_.company}}, title, state, @{N="feide"; E={if ($_.memberOf -like "*VT-ALLE-LÆRERE*") {$True} else {$False}}}

    # get ad apprentice users from AUTO USERS
    Write-Host "Finding apprentice 'AUTO USERS' from skole.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Lærling VTFK
    $adUsers += GetADUser -Domain "skole.top.no" -Filter "Title -eq 'Lærling' -and extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Properties givenName,sn,displayName,employeeNumber,department,company,mail,proxyAddresses,title -OnlyAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"skole"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO USERS"}}, @{N="departmentShort"; E={$_.department}}, @{N="office"; E={$_.company}}, @{N="company"; E={$_.company}}, title

    # get ad ot kids from AUTO USERS
    Write-Host "Finding OT 'AUTO USERS' from skole.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # OT VTFK
    $adUsers += GetADUser -Domain "skole.top.no" -Filter "extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Base "USERS OT" -Properties givenName,sn,displayName,employeeNumber,department,company,mail,proxyAddresses,title -OnlyAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"skole"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO USERS"}}, @{N="departmentShort"; E={$_.department}}, @{N="office"; E={$_.company}}, @{N="company"; E={$_.company}}, title

    # get ad VTFK users from AUTO DISABLED USERS
    Write-Host "Finding 'AUTO DISABLED USERS' from login.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Ansatt VTFK disabled
    $adUsers += GetADUser -Domain "login.top.no" -Filter "extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Properties memberOf,givenName,sn,displayName,employeeNumber,extensionAttribute4,extensionAttribute6,extensionAttribute7,extensionAttribute9,extensionAttribute14,company,physicalDeliveryOfficeName,mail,proxyAddresses,title,state -OnlyDisabledAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"login"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO DISABLED USERS"}}, extensionAttribute7, extensionAttribute9, extensionAttribute14, @{N="departmentShort"; E={$_.extensionAttribute6}}, @{N="departmentAdditional"; E={$_.extensionAttribute4}}, @{N="office"; E={$_.physicalDeliveryOfficeName}}, @{N="company"; E={$_.company}}, title, state, @{N="feide"; E={if ($_.memberOf -like "*VT-ALLE-LÆRERE*") {$True} else {$False}}}
    Write-Host "Finding 'AUTO DISABLED USERS' from skole.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Elev VTFK disabled
    $adUsers += GetADUser -Domain "skole.top.no" -Filter "Title -eq 'Elev' -and extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Properties givenName,sn,displayName,employeeNumber,department,company,mail,proxyAddresses,title -OnlyDisabledAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"skole"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO DISABLED USERS"}}, @{N="departmentShort"; E={$_.department}}, @{N="office"; E={$_.company}}, @{N="company"; E={$_.company}}, title

    # get ad VFYLKE users from AUTO DISABLED USERS
    Write-Host "Finding 'AUTO DISABLED USERS' from login.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Ansatt VFYLKE disabled
    $adUsers += GetADUser -Domain "login.top.no" -OU $countyOU -Filter "*" -Properties memberOf,givenName,sn,displayName,employeeNumber,extensionAttribute4,extensionAttribute6,extensionAttribute7,extensionAttribute9,extensionAttribute14,company,physicalDeliveryOfficeName,mail,proxyAddresses,title,state -OnlyDisabledAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"login"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={$countyOU}},  @{N="ou"; E={"AUTO DISABLED USERS"}}, extensionAttribute7, extensionAttribute9, extensionAttribute14, @{N="departmentShort"; E={$_.extensionAttribute6}}, @{N="departmentAdditional"; E={$_.extensionAttribute4}}, @{N="office"; E={$_.physicalDeliveryOfficeName}}, @{N="company"; E={$_.company}}, title, state, @{N="feide"; E={if ($_.memberOf -like "*VT-ALLE-LÆRERE*") {$True} else {$False}}}

    # get ad apprentice users from AUTO DISABLED USERS
    Write-Host "Finding apprentice 'AUTO DISABLED USERS' from skole.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # Lærling VTFK disabled
    $adUsers += GetADUser -Domain "skole.top.no" -Filter "Title -eq 'Lærling' -and extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Properties givenName,sn,displayName,employeeNumber,department,company,mail,proxyAddresses,title -OnlyDisabledAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"skole"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO DISABLED USERS"}}, @{N="departmentShort"; E={$_.department}}, @{N="office"; E={$_.company}}, @{N="company"; E={$_.company}}, title
    
    # get ad ot kids from AUTO DISABLED USERS
    Write-Host "Finding OT 'AUTO DISABLED USERS' from skole.top.no : $(Get-Date -Format 'HH:mm:ss')" -Verbose
    # OT VTFK disabled
    $adUsers += GetADUser -Domain "skole.top.no" -Filter "extensionAttribute14 -ne '$filterVekkExt14' -or extensionAttribute14 -notlike '*'" -Base "USERS OT" -Properties givenName,sn,displayName,employeeNumber,department,company,mail,proxyAddresses,title -OnlyDisabledAutoUsers | Select-Object userPrincipalName, samAccountName, givenName, mail, proxyAddresses, @{N="surName"; E={$_.sn}}, displayName, @{N="domain"; E={"skole"}}, employeeNumber, @{N="timestamp"; E={Get-Date -Format o}}, enabled, @{N="countyOU"; E={"VTFK"}}, @{N="ou"; E={"AUTO DISABLED USERS"}}, @{N="departmentShort"; E={$_.department}}, @{N="office"; E={$_.company}}, @{N="company"; E={$_.company}}, title

    # export users
    $exportFile = "$dbUpdateFolder\data\users.json"
    Write-Host "Exporting data to '$($exportFile)'" -Verbose
    $adUsers | ConvertTo-Json -Depth 20 | Out-File -FilePath $exportFile -Encoding utf8 -Force -NoNewline
    
    # update db
    $currentLocation = Get-Location | Select-Object -ExpandProperty Path
    try {
        Set-Location -Path $dbUpdateFolder
        Write-Host "Invoking node to update database" -Verbose
        Invoke-Expression -Command "node .\index.js users" -ErrorAction Stop
    }
    catch {
        Write-Error -Message "Failed to update DUST users DB : $_" -ErrorAction Stop
    }
    finally {
        Set-Location -Path $currentLocation
    }

    Write-Host "DONE AD Users : $(Get-Date -Format 'HH:mm:ss')" -Verbose
}

Function Update-DUSTVigoOTUsers {
    Write-Host "Starting VIGO OT Users : $(Get-Date -Format 'HH:mm:ss')" -Verbose

    # get and update users
    $currentLocation = Get-Location | Select-Object -ExpandProperty Path
    try {
        Set-Location -Path $vigoUpdateFolder
        Write-Host "Invoking node to get vigo ot users" -Verbose
        Invoke-Expression -Command "node .\index.js ot" -ErrorAction Stop
    }
    catch {
        Write-Error -Message "Failed to update get and/or update users DB : $_" -ErrorAction Stop
    }
    finally {
        Set-Location -Path $currentLocation
    }

    Write-Host "DONE VIGO OT Users : $(Get-Date -Format 'HH:mm:ss')" -Verbose
}

Function Update-DUSTVigoLaerlingUsers {
    Write-Host "Starting VIGO Laerling Users : $(Get-Date -Format 'HH:mm:ss')" -Verbose

    # get and update users
    $currentLocation = Get-Location | Select-Object -ExpandProperty Path
    try {
        Set-Location -Path $vigoUpdateFolder
        Write-Host "Invoking node to get vigo laerling users" -Verbose
        Invoke-Expression -Command "node .\index.js laerling" -ErrorAction Stop
    }
    catch {
        Write-Error -Message "Failed to update get and/or update users DB : $_" -ErrorAction Stop
    }
    finally {
        Set-Location -Path $currentLocation
    }

    Write-Host "DONE VIGO Laerling Users : $(Get-Date -Format 'HH:mm:ss')" -Verbose
}

# db-update folder path
$dbUpdateFolder = Resolve-Path -Path "$($PSScriptRoot)\db-update" | Select-Object -ExpandProperty Path

# vigo-update folder path
$vigoUpdateFolder = Resolve-Path -Path "$($PSScriptRoot)\vigo-update" | Select-Object -ExpandProperty Path

# call update functions for AD users
Update-DUSTADUsers

# call get/update functions for vigo ot kids
# Update-DUSTVigoOTUsers # Brukes denne?

# call get/update functions for vigo lærling
# Update-DUSTVigoLaerlingUsers # Brukes denne a?