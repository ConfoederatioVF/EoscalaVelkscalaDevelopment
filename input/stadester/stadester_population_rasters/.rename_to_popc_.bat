@echo off
setlocal enabledelayedexpansion

for %%F in (stadester_population_*.png) do (
    set "filename=%%~nF"
    
    rem Extract the year (token 3)
    for /f "tokens=3 delims=_" %%A in ("!filename!") do (
        set "year=%%A"
        
        rem Check if the year is negative (which represents BC)
        if "!year:~0,1!"=="-" (
            set "abs_year=!year:~1!"
            set "era=BC"
        ) else (
            set "abs_year=!year!"
            set "era=AD"
        )
        
        ren "%%F" "popc_!abs_year!!era!_number.png"
    )
)