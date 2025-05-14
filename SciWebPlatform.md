SciWeb's main page is the MyWeb page. Here, users can add nodes and edges to their map.
These nodes are organized into 3 services designed to meet the needs of different types of users:

1. Organization Framework
2. Learning System
3. Academic System

Organization Framework

    Node Types:
    - Motivator
        - What drives you, why you do what you do, what you believe in, what you want to achieve.
        - Links to envision page, which lets you add motivational images, videos, and arguments for why this is important to you, why you deserve it and believe it’s attainable.
        - On the Friend Web page, you can see others' motivators and add content and words of encouragement to their motivators.
        - Often towards the top of the page with other node types below it
        - AI option: question: AI tries to better understand your motivator and how you're pursuing it.
        - AI option: bolster: AI tries to find ways to bolster your motivator.
    - Task
        - A concrete task that you need to complete.
        - Can set due date & target date
        - AI option: How do I do this?
        - AI option: break into sub-tasks
    - Challenge
        - Something that you need to ponder, a challenge to your beliefs or assumptions that you need to overcome.
        - Often instead of a task when you need to consider how to implement something.
        - AI option: contextualize
        - AI option: avert
        - AI option: solve

    - Counselor
        - An AI chatbot with specific, preset instructions that checks in with you on a preset schedule.
        - Enables accountability and motivation across time
        - Often connected to motivators, tasks, challenges, and goals
        - Links to counselor page, which contains the counselor's profile, settings, instructions, and chat history.
        - Can directly set tasks, challenges, and goals in MyWeb.
        - Can be configured to call functions to access grades(class, assignment, GPA, trends, etc.)
        - Can send reminders to the user(email, text, notification, etc.)

Academic System

    Node Types:
    - Class
        - A class you are taking.
        - links to the class page, which contains the course materials, grades, chats/channels, practice problems/tests, and assignments.
    - Assignment
        - An assignment you need to complete for a class.
        - also links to the class page
        - shared among class members: automatically added to every member's Web under the class node
    - Test
        - An upcoming test for a class.
        - is the parent of learning nodes
        - settings button to configure learning experience and topics list
        - AI option: Make diagnostic test
        - can show studying progress bar
        - shared among class members: automatically added to every member's Web under the class node

    - Project
        - A joint project with other users.
        - links to the project page, which contains the project details, whiteboard, files, tasks, and progress.
        - all nodes under this are shared among all collaborators
        - Option: Add collaborators
    - Essay
        - An essay you need to write for a class.
        - links to the essay page, which contains the essay details, instructions, peer review, and feedback option, and AI grading with multivariate linear regression model predicting teacher-specific essay score
        - Option: submit for peer review(opens essay page and allows you to select peers)
        - Option: Score essay with AI(opens essay page and initiates AI scoring)
        - shared among class members: automatically added to every member's Web under the class node
    - Goal
        - A strategic, quantitative grade goal for a class, category, or GPA.
        - shows progress bar
        - Option: Open Grade Analysis(opens grade analysis page)
        - Option: Adjust goal
        - Option: Optimize with AI

Learning System

    Node Types:
    - Key idea
        - Formula, law, theorem, historical event, etc.
        - Option: learn more(opens google search of the key idea)
    - Question
        - Something the AI adds to the map to probe the user's understanding
        - Option: recontextualize(adds simpler question nodes to create a basis of idea nodes that better informs that question)
    - Problem Type
        - A type of problem that you can solve with a specific method
        - links to practice module page where you can AI generate problems and solve them.
        - can show number of right/wrong answers




2 node types are not associated with a specific service:
- Idea nodes(this is the most basic and common type of node and is used to contextualize, connect, and store information about every other node type. no special features)
- Image nodes(to make the map personal and unique. no special features)

All nodes have a window that shows on hover and contains the features and options for that node.
All nodes have a remove button, connect button, and edit button.


Voice add:
This feature allows the website to record you talking about things related to your map. It will then transcribe your voice, and pass it into the OpenAI API. With the predicted output features, it will make new nodes out of what you said and integrate them into your map.

For learning nodes, this capability will be extended to add questions, problems, and key ideas that guide your learning.





