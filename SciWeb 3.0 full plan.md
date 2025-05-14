Main Pages(linked in navbar):

Saad
Paul
Aaron
Itamar

Complete



Home
Mostly done
Just add what SciWeb allows you to do, that is the recording-expansion system
In My Web, it’s structured so that your understanding of the matter/content at hand is the same as the AI’s by fully representing it on the map
Then the AI, through the decentralized, custom node expansion options, will give you something you haven’t considered before, that will prompt your reconsideration, you’ll represent that on the map, and the cycle continues.
On the home page maybe represent this as a cyclical structure, as described above.
Login Page
“My Web” page (formerly TodoTree)
Show user’s personal node types
Properly load and render those node types with custom expansion options, properly executable
Nodes are added through voice mode
This works, but changes OpenAI functionality from Structured Output to Predicted Output(have it generate an array of nodes: [{id, name, type, connections:{id: length}}, …}
Give the AI assistant bar access to My Web. Make it fully functional
Allow area-selection: this hides all other nodes on the map except for the ones in a specific area, essentially decluttering it. When you activate voice mode, it only passes in those nodes. Otherwise make sure it passes in the whole map.
Some nodes open their own subpages(see below)
Implement other node type options for library(have button in node type add menu to access that library)
For learning objective node type, have settings window with same options as were in mindweb.
Interface My Web page with scheduling somehow(This must be developed more and should not be included in initial launch)
In the future: map export/representation tools
Onboarding Page
Sign up page: keep as is but add cool animations, like have a "hello, name" button pop up as soon as they enter their name. Also get rid of the grade level option on the sign up page.
Email verification: make this actually work, but keep the same UI.
usertype page(MS/HS student, college/grad student, career professional)(keep as is), but once they select one, let them specify an institution, grade/year(as appropriate), and major/career(as appropriate).
(New page) SciWeb Motivations: Which goals do you want to pursue with SciWeb? Briefly contextualize these goals. How do you want to use SciWeb? Have a brief conversation with the AI to get to know the user and their goals.
(New page) SciWeb Experience page. Start with a cool looking loading animation, "while we personalize your SciWeb experience...". Then, in a cinematic way, explain how SciWeb works and how it can benefit the student in the context of their goals.
Use AI to take in their goals and preferences, along with how SciWeb works, and have it return cards with the best ways in which SciWeb can help them achieve their goals.
The purpose of SciWeb is to help the user to build a comprehensive and representative network of ideas, plans, and motivations, and to help them question, expand, and improve it in service of their goals.
Also present some additional features(Grade Analysis, Shared Motivations feed, classes page, etc.) that may be of interest to the user.
(New page) SciWeb Customization: Using the user's goals and motivations, we will customize SciWeb to their needs.
Spotlight the nodes that are most relevant to the user's goals and motivations, but let them choose any combination of nodes they want.
For each node type, let them choose the color, shape, icon, and font.
Also let them choose from a menu of node-specific features, all of which allow them to harness AI to expand and question their ideas, plans, and motivations.
For those node types that have their own page or settings associated with them(class, motivation, essay, project, learning objective, and problem type), if they select one of these, familiarize them with the page and its features.
Jupiter Page: in the info section of the page, introduce the user to some of the grade analysis features available to them on the grade analysis page. Keep the functionality as is.
Classes page: keep as is.
Get rid of the counselor page. This functionality will go in the Customization page.
Complete page: keep as is.

NHS
apply(c&p)
Pages: admin, member, students, teachers 
credits(admin, members sign up)
tutoring(members sign up for tutoring,
Schedule Page(on hold for now)
Shows today’s tasks in a linear order
Course selection link
User can shuffle them around, add breaks/free time
Tools for staying focused while doing them(expand on this)
Shows SciEvents™ (study group meetings, class study sessions, tutoring sessions, SciGames(study games like kahoot but harder)?), allow user to RSVP & add to schedule
Allow user to create these events/sessions
Prompts user to schedule counselor meeting every week(includes going over E.C.s, grade review, and other updates)

Next step: Reintegration of the best features in all previous SciWeb versions into this new framework


Node-specific pages linked through Tree page nodes(not in navbar):

Envision(through motivator node)
Allows you to create a dream wall with photo, video clips, arguments for why this is important to you, why you deserve it and believe it’s attainable.
Class(through class,assignment, test, project, essay nodes)
Shows users in that class, chats/channels, upcoming events/study sessions, users online now, study guides, upcoming assignments for that class, distribution of time spent for each, grade & recent scores, worksheets, practice problems/tests
Collab(Through Project Node)
Can add collaborators to the project, automatically shares all child nodes of the project node, add whiteboards, delegate tasks, etc.
Write(through essay node)
 
Grade Analysis(linked in various places) 
Revamped but otherwise similar

Sign-up & Onboarding page (LAST)

Collect first name, last name, username(optional), email address, grade
Email verification(code sent and entered)
Are you a…(MS/HS student, college/grad student, career professional)
Which SciWeb services do you wish to use(organizational Tree, Study system, Social platform)
Initial Jupiter Pull(indicate that no grades/login info is ever saved)
Show classes that it found(with current members listed) with a Join button on each
Show the user’s schedule based on that, and allow them to drag classes around and then confirm it
Show some basic stats and graph with a list of further features in grade analysis
Prompt the user for what motivates them(in school, in life, etc.) and say that SciWeb will have them expand on these and build a personalized plan towards achieving them.
Let the user select avatar, name, and personality for their 3 counselors, and explain how to use them

MindWeb:

Have users specify topic list/goal when creating the study node
When they open the MindState page, it gives them instructions(your job is to keep the concept map updated with your understanding of the material, regardless of its correctness or completeness, and the AI will guide you through building on it.)
Start with a blank concept map. The AI will ask the user for the user’s current understanding(brand new, familiar, confident), then start giving problems and theoretical questions to challenge the user’s understanding as represented in the concept map. 
Evaluation: timed realistic questions

Counselor:
3 different avatars with different levels of feedback and capabilities(admissions officer, strategic coordinator, Assistant)
The Admissions Officer bot accesses the user’s transcript, resume, ECs, and motivations to give high-level feedback to the user. Their advice can be passed in as context to a conversation with the Strategic Coordinator. Conversations around every 2-3 months
The Strategic Coordinator bot can fetch detailed grade data, surf through the Tree, adding, updating, and editing nodes, editing the resume, searching the web for opportunities, discussing progress in ECs, ambitions, motivations in detail, etc. Weekly conversations
The Assistant bot is the user’s day to day assistant for getting their work done, and it serves as a guide for how to use the website to address their needs. It can access tasks, tests, projects, essays, schedules, etc. to help the user manage their day to day.
The assistant bot shows up as an icon on every page that can be popped open at any time, whereas the other two are accessed on the counselor page.


Modifications:

- show/hide idea nodes on my web
- have a bunch of decentralized options for each node: break it down, find motivation, rethink this, etc, and all across the website
- On the schedule, show the highest priority nodes, set deadlines, drag onto calendar, set estimated time, create session with other people, 
- When the user postpones a task, prompt them why, and offer the options above
- show social connections on my web: friend requests, schedule regular meetings, share progress, share webs, league functionality: automatic grade shares
- people show up as profile pics on the web and connect to tasks under academic motivations
- add new social node types on my web, have assignment/assessment nodes on hover
- assistant is accessed with decentralized buttons, accesses and manipulates centralized information
- every time you call the assistant, it can add idea nodes in my web
- find images/diagrams tool on mindweb
- 
