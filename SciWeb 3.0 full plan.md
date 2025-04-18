Main Pages(linked in navbar):

Saad
Paul
Aaron
Itamar



Home(currently pitch): contains updated info about sciweb, our mission, philosophy, how it’s useful, about us, etc.
Login(pretty much the same as the current one)/Sign up page(more below)/Profile
“My Web” page (formerly TodoTree)
similar to current(importance/priority nodes), but with more node types(motivator, task, question, idea, class, assignment, test, project, essay)
Nodes are added through the ai chatbot, after the user explains its specifications
Each opens its own task-specific features/pages
Options to push nodes prioritized for today into the schedule page
Assistant can call functions addNode(type, parent, name, info), getNodeStructure(), nodeInfo(nodeId), editNode(nodeId, info), deleteNode(nodeId)
Schedule Page
Shows today’s tasks in a linear order
Course selection link
User can shuffle them around, add breaks/free time
Tools for staying focused while doing them(expand on this)
Shows SciEvents™ (study group meetings, class study sessions, tutoring sessions, SciGames(study games like kahoot but harder)?), allow user to RSVP & add to schedule
Allow user to create these events/sessions
Prompts user to schedule counselor meeting every week(includes going over E.C.s, grade review, and other updates)
NHS
apply(c&p)
Pages: admin, member, students, teachers 
credits(admin, members sign up)
tutoring(members sign up for tutoring,

UI:
Light mode & Dark mode
Unified styles, make it look really good, be pretty picky with cursor about it


Node-specific pages linked through Tree page nodes(not in navbar):

Envision(through motivator node)
Allows you to create a dream wall with photo, video clips, arguments for why this is important to you, why you deserve it and believe it’s attainable.
Class(through class,assignment, test, project, essay nodes)
Shows users in that class, chats/channels, upcoming events/study sessions, users online now, study guides, upcoming assignments for that class, distribution of time spent for each, grade & recent scores, worksheets, practice problems/tests
MindWeb(through test node)
More on this later
Have option to show MindWeb under this node
Collab(Through Project Node)
Can add collaborators to the project, automatically shares all child nodes of the project node, add whiteboards, delegate tasks, etc.
Write(through essay node)
Lets user upload their essay, AI evaluates it, scores it on(creativity, argumentation, grammar, organization, evidence, analysis, general) each with their own standardized scoring rubric
AI provides feedback for each category
Final essay draft scores are saved and compared to the grade that they actually received
A multivariate linear regression is run on all essays, giving a predicted essay score for that teacher, and plots of means, distributions, coefficients, scores vs. individual metrics, etc.
Peer review system
Grade Analysis(linked in various places) 
Revamped but otherwise similar

Sign-up & Onboarding page (LAST)

Collect first name, last name, username(optional), email address, grade
Email verification(code sent and entered)
Are you a…(MS/HS student, college/grad student, career professional)
Which SciWeb services do you wish to use(organizational Tree, Study system, Social platform)
Initial Jupiter Pull(indicate that no grades/login info is ever saved)
Show classes that it found(with current members listed) with a Join button on each
Show a whole bunch of stats and graphs of the user's grades and scores, and allow them to select the ones they want on their grade analysis page and shuffle them around
Let the user select a name and avatar for their 3 counselors, and one by one set up a short conversation with each of them where the counselor introduces themself and its capabilities and explains how to use it, and the user specifies what personality they want for each of them, and how they want to use it
Prompt the user for what motivates them(in school, in life, etc.) and say that SciWeb will have them expand on these and build a personalized plan towards achieving them.


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


Integrate all features from previous SciWeb versions, centered around this framework


