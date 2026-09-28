Here's a documentation file you can send directly to your backend teammate.



Database Setup \& Course Import Guide



Project: HKU Schedule Planner

&#x20;Maintainer: Database \& Deployment Team

&#x20;Purpose: Set up the MySQL database, import HKU timetable data, and access course information through SQL queries.



Overview



The database pipeline works as follows:



HKU Excel Timetable

&#x20;       ↓

R Data Cleaning

&#x20;       ↓

HKU\_timetable\_2026-2027.json

&#x20;       ↓

importCourses.js

&#x20;       ↓

MySQL Database (Docker)

&#x20;       ↓

Express Backend API

&#x20;       ↓

Frontend





The JSON file should be treated as a one-time import source.



The backend should query MySQL directly after the import is completed.



Repository Contents

Database/

│

├── docker-compose.yml

├── schema.sql

├── HKU\_timetable\_2026-2027.json

├── importCourses.js

├── package.json

├── package-lock.json

└── excel\_to\_json\_timetable.R



Prerequisites



Install:



Docker Desktop



Verify installation:



docker --version





Expected:



Docker version ...



Node.js



Verify installation:



node --version





Expected:



v22.x.x





or newer.



Step 1: Pull the Repository



Clone the project:



git clone <repository-url>





Navigate to the database directory:



cd Project/Database





Verify files:



dir





or



ls





Expected:



docker-compose.yml

schema.sql

HKU\_timetable\_2026-2027.json

importCourses.js

package.json

...



Step 2: Start MySQL with Docker



Start the container:



docker compose up -d





This command:



Downloads MySQL (first time only)

Creates the database container

Creates database hkuplanner



Verify that MySQL is running:



docker ps





Expected:



hku-planner-db



Step 3: Create Database Tables



The schema has already been prepared inside:



schema.sql



PowerShell



Run:



Get-Content .\\schema.sql | docker exec -i hku-planner-db mysql -u root -prootpassword hkuplanner



Git Bash / Linux / Mac



Run:



docker exec -i hku-planner-db mysql -u root -prootpassword hkuplanner < schema.sql





This creates all required tables.



No output is normal.



Step 4: Verify Schema Creation



Connect to MySQL:



docker exec -it hku-planner-db mysql -u root -p





Enter password:



rootpassword





Select database:



USE hkuplanner;





Check tables:



SHOW TABLES;





Expected:



courses

sections

meetings

instructors





View table structure:



DESCRIBE courses;



DESCRIBE sections;



DESCRIBE meetings;



DESCRIBE instructors;





Exit MySQL:



exit



Step 5: Install Node Dependencies



Install the project's dependencies:



npm install





This installs:



mysql2





used by the import script.



Step 6: Import HKU Timetable Data



The file:



HKU\_timetable\_2026-2027.json





contains all timetable information.



Run:



node importCourses.js





Expected output:



Connected to MySQL

Imported ACCT1101 1A

Imported ACCT1101 1B

Imported COMP2113 1A

...

Import completed





This step populates:



courses

sections

meetings

instructors



tables.



Depending on machine speed, this may take a few minutes.



Step 7: Verify Data Import



Reconnect to MySQL:



docker exec -it hku-planner-db mysql -u root -p



USE hkuplanner;





Check table sizes:



SELECT COUNT(\*) FROM courses;



SELECT COUNT(\*) FROM sections;



SELECT COUNT(\*) FROM meetings;



SELECT COUNT(\*) FROM instructors;





Each query should return a positive number.



Database Structure

courses



Stores general course information.



Example:



COMP3322

COMP2113

ACCT1101





Columns:



course\_code

course\_title

department

academic\_career



sections



Stores section information.



Example:



COMP3322

Section 1A





Columns:



class\_number

course\_code

class\_section





Each section belongs to one course.



meetings



Stores teaching schedule information.



Example:



Monday

14:00-15:50

CPD-LG.07





Columns:



meeting\_id

class\_number

term

start\_date

end\_date

day\_of\_week

start\_time

end\_time

venue





A section may have multiple meetings.



Example:



COMP3322 LEC1

&#x20;├── Monday 14:00-15:50

&#x20;└── Wednesday 14:00-15:50



instructors



Stores instructor assignments.



Columns:



instructor\_id

class\_number

instructor\_name





A section may have multiple instructors.



Useful Queries

Get All Courses

SELECT \*

FROM courses;



Find A Specific Course

SELECT \*

FROM courses

WHERE course\_code = 'COMP3322';



Get All Sections Of A Course

SELECT \*

FROM sections

WHERE course\_code = 'COMP3322';



Get Schedule Of A Course

SELECT \*

FROM meetings m

JOIN sections s

ON m.class\_number = s.class\_number

WHERE s.course\_code = 'COMP3322';



Get All Monday Classes

SELECT \*

FROM meetings

WHERE day\_of\_week = 'MON';



Get Classes Starting After 2 PM

SELECT \*

FROM meetings

WHERE start\_time >= '14:00:00';



Get Instructors For A Section

SELECT \*

FROM instructors

WHERE class\_number = 1234;



Connecting Express To MySQL



Example connection:



const mysql = require("mysql2/promise");



const db = await mysql.createConnection({

&#x20;   host: "localhost",

&#x20;   user: "root",

&#x20;   password: "rootpassword",

&#x20;   database: "hkuplanner"

});



Example API Endpoint



Return all courses:



app.get("/courses", async (req, res) => {



&#x20;   const \[rows] =

&#x20;       await db.execute(

&#x20;           "SELECT \* FROM courses"

&#x20;       );



&#x20;   res.json(rows);



});





Frontend should consume API endpoints instead of reading the JSON file.



If Database Needs To Be Reset



Stop container:



docker compose down





Remove database volume:



docker compose down -v





Start again:



docker compose up -d





Then repeat:



Create schema

Run import script

Important Notes

Do not edit HKU\_timetable\_2026-2027.json manually.

Treat JSON as the source data used for importing.

The application should query MySQL, not the JSON file.

If timetable data changes, regenerate the JSON and rerun the import process.

Docker persists data between restarts unless the volume is deleted.



Once these steps are complete, the backend can immediately begin implementing timetable search, filtering, course selection, and schedule conflict detection APIs using the MySQL database.

