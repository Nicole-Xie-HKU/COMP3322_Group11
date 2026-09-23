COMP3322 - Project: Virtual Schedule Builder for HKU



=================================================================================================================================

MEMBER INFORMATION:
1. LU Bingzhang (3035834759)

2\. WANG Xiangwu (3036538663)

3\. XIE Nicole (3036717491)

4\. XU Jingfeng (3036589416)

5\. ZHANG Yuening (3036589090)

==================================================================================================================================

PROJECT TITLE:

HKUPlan : A Improved Virtual Schedule Builder and Course Planning System made by HKU Students for HKU Students 📆

==================================================================================================================================

PROJECT DESCRIPTION:

HKUPlan is a web-based timetable planning application designed to help University of Hong Kong (HKU) students efficiently build and compare semester schedules before course registration. The system allows users to search for courses, select lecture, tutorial, and laboratory sections, and visualize their schedules through an clear weekly timetable. The application automatically detects scheduling conflicts and generates valid timetable combinations based on the user's selected courses. The target end-users are HKU undergraduate and postgraduate students who want a faster and more intuitive way to plan their academic schedules. The program is also made available without login, allowing incoming students still awaiting their HKU credentials to plan ahead their journey.

==================================================================================================================================

FEATURE LIST:



* MUST-HAVE FEATURES:

  * Course Search and Selection

    * Search courses by course code or course name.
    * View available lectures, tutorials, and laboratory sections.
  * Course Information

    * Display available course information like remaining seats, instructor, campus, etc.
  * Timetable Visualization

    * Display selected classes in a weekly timetable view.
    * Automatically update the timetable when sections are added or removed.
  * Conflict Detection and Schedule Generation

    * Detect overlapping classes.
    * Generate all valid timetable combinations from selected courses.
    * Exclude schedules containing time conflicts.
  * Save Schedules and Print

    * Allow users to save generated timetables.
    * Allow users to print out generated timetables.



* NICE-TO-HAVE FEATURES:

  * User Registration and Login

    * Allow users to login using HKU credentials to save, view and edit timetables
  * Schedule Preferences

    * Prioritize schedules based on user preferences (i.e. No morning classes, No Friday classes, Longer lunch breaks)
  * Course Bookmarking

    * Allow users to favorite frequently selected courses
  * Share Schedule Functionality

    * Generate shareable link for schedules

==================================================================================================================================

FULL TECHNOLOGY-STACK SELECTION:

* Frontend Framework: React + Vite + Tailwind CSS
* Backend Framework: Node.js + Express
* Database: MySQL
* Deployment Platform: Docker
* External Third-Party Tools: FullCalendar (For timetable visualization), JWT and bcryptjs (if we include Authentication), GitHub

==================================================================================================================================

PRELIMINARY TEAM TASK ALLOCATION:

1\. LU Bingzhang (3035834759):



2\. WANG Xiangwu (3036538663):



3\. XIE Nicole (3036717491):



4\. XU Jingfeng (3036589416):



5\. ZHANG Yuening (3036589090):



Frontend Lead:

&#x09;- Design application UI/UX

&#x09;- Implement React components

&#x09;- Build timetable visualization

&#x09;- Ensure responsive design

Timetable Visualization:

&#x09;- Develop the interactive weekly timetable view.

&#x09;- Implement course selection and timetable updates.

&#x09;- Handle timetable rendering and visual conflict highlighting.

&#x09;- Integrate timetable-related frontend functionality.

Backend Lead: 

&#x09;- Develop RESTful API using Express

&#x09;- Implement authentication and authorization

&#x09;- Handle API validation and error management

Database \& Deployment Lead:

&#x09;- Design MySQL schema

&#x09;- Create database queries and relationships

&#x09;- Configure Docker, Docker Compose, and deployment environment

Scheduling Algorithm Lead:

&#x09;- Implement conflict detection

&#x09;- Develop timetable generation algorithm

&#x09;- Implement schedule optimization logic

==================================================================================================================================

ADDITIONAL INFORMATION:



1. PROBLEM \& TARGET USER CONTEXT:

Planning a semester schedule at the University of Hong Kong (HKU) can be inconvenient and time-consuming. While HKU currently provides timetable planning tools, students often face several limitations. Course and timetable information may not always be presented in a clear and user-friendly manner, requiring students to navigate multiple pages when comparing different course combinations. Students must repeatedly search for and add courses when exploring alternative schedules, making the planning process inefficient. In addition, incoming exchange students and newly admitted students may not yet possess valid HKU credentials, preventing them from accessing certain university systems and planning their schedules before arriving at HKU.



HKU Schedule Planner aims to provide a centralized and intuitive timetable planning platform that allows users to search courses, generate possible schedules, visualize conflicts, and compare timetable options in a single interface. Inspired by tools such as McGill University's Virtual Schedule Builder, the platform focuses on improving accessibility, usability, and convenience during course planning.



Target Users

The primary target users are current HKU undergraduate and postgraduate students who need to plan their semester schedules before course registration. The system is also intended to support exchange students, incoming students, and prospective HKU students who wish to explore courses and build tentative schedules before receiving HKU login credentials.



2\. HIGH-LEVEL WORKFLOW DESCRIPTION:

&#x09;1. Landing Page:

&#x09;- User opens HKU Schedule Builder.

&#x09;- User is presented with information about the system and options to log in or continue as a guest.

&#x09;2. Course Selection Page:

&#x09;- User searches for courses using course codes or course names.

&#x09;- User adds desired courses to a planning list.

&#x09;3. Schedule Generation and Timetable View:

&#x09;- The system evaluates available lecture, tutorial and laboratory sections.

&#x09;- The system produces valid timetable combinations and removes conflicting options.

&#x09;- User views generated schedules in a weekly timetable.

&#x09;- Classes are displayed as colored blocks on the timetable. 

&#x09;4. (If we get to Nice-to-have features) Save and Manage Schedules:

&#x09;- Logged-in users can save preferred schedules.

&#x09;- Saved schedules are stored and can be viewed, revisited, renamed, or deleted later.



3\. Anticipated Learning Challenges \& Self-Assessment:

\---

Challenge 1: Learning React and Frontend Development

Why it is a challenge:

Most team members have limited experience with frontend development frameworks and responsive user interface design.



Mitigation Plan:

The team will follow React tutorials and create small practice components before developing the main application. Team members responsible for frontend development will also explore example React projects and timetable UI libraries.

\---

Challenge 2: Building the Schedule Generation Algorithm

Why it is a challenge:

Generating all valid timetable combinations while avoiding scheduling conflicts requires algorithmic thinking beyond basic CRUD operations.



Mitigation Plan:

The team will first implement a simple conflict detection system before gradually extending it into a timetable generation algorithm. The algorithm will be tested using small sample datasets before being integrated into the full application.

\---

Challenge 3: Docker Deployment and System Integration

Why it is a challenge:

Most team members have little or no experience using Docker, Docker Compose, and deploying multi-service applications.



Mitigation Plan:

Other than attending the tutorials and following guides online, the team will try to create a simple Docker prototype early in the project containing only React, Express, and MySQL services. This will allow deployment issues to be identified and resolved before the final project submission.

==================================================================================================================================





