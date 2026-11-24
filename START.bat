@echo off
chcp 65001 >nul
title Viktorina
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
