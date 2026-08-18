@echo off
:loop
cls
echo Eoscala 1.3/Velkscala 0.8 - Historical Economic and Population Statistics.
node --max-old-space-size=128000 --expose-gc --trace-uncaught "main.js"
pause
goto loop
