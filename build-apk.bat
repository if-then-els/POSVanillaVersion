@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%
java -version
cd /d D:\projects\POS\android
call gradlew.bat --stop
call gradlew.bat assembleDebug
