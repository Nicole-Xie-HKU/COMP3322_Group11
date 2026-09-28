Hello!
Here are the important steps to take after pulling everything from GitHub:


1. make sure you have git, node:
git --version
node --version
npm --version
(if these don't work, install them!)

2. Make sure you have Docker, use:
docker --version (to check)

3. Clone repository:
git clone https://github.com/Nicole-Xie-HKU/COMP3322_Group11.git

4. Change to database directory
cd path_to_directory/Database

5. Run:
ls
You should see:
docker-compose.yml
schema.sql //this will be used to create Tables in SQL
importCourses.js //this will be ran with Node to automate import from .json to .sql
HKU_timetable_2026-2027.json //the .json file with course data
package.json
package-lock.json

6. Run:
npm install
This will install mysql2 from package.json

7. Now, we start MySQL:
docker compose up -d
(you can verify with:
"docker ps",
and you should see "hku-planner-db")

8. Now, we create TABLES:
Command on Git Bash/Linux/Mac:
docker exec -i hku-planner-db mysql -u root -prootpassword hkuplanner < schema.sql

Command on Windows PowerShell:
Get-Content .\schema.sql | docker exec -i hku-planner-db mysql -u root -prootpassword hkuplanner

9. Verify tables:
a. Connect:
docker exec -it hku-planner-db mysql -u root -p
"Enter password:" rootpassword   (then click Enter)
(when you type, nothing will appear because it is invisible to protect the password.)
b. Move to hkuplanner:
USE hkuplanner;
SHOW TABLES;
You should see:
courses
sections
meetings
instructors
c. We now exit:
exit

10. Import HKU Data!
node importCourses.js
You should now see a running progam with:
Connected to MySQL
 
Imported ACCT1101 1A
Imported ACCT1101 1B
...
(THIS PROCESS SHOULD RUN FOR ALMOST 3-5 MIN, let it run, DO NOT CANCEL.)

11. Now, we connect again and check that everything is imported correctly:
a. docker exec -it hku-planner-db mysql -u root -p
"Enter password:" rootpassword
USE hkuplanner;

b. Check counts:
SELECT COUNT(*) FROM courses;
SELECT COUNT(*) FROM sections;
SELECT COUNT(*) FROM meetings;
SELECT COUNT(*) FROM instructors;
if the counts are NOT 0, it should be correct!!



****In case you have to update database or start from scratch****
1. Delete Database completely:
docker compose down -v
2. Start again from step 7 above.
*****************************************************************