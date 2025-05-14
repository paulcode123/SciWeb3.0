# SciWeb Master Plan (v3.1)

## Vision & Philosophy
SciWeb is a platform designed to help users build a comprehensive, living map of their ideas, plans, motivations, and learning objectives. The core philosophy is that all aspects of a user's pursuits can be represented as nodes and connections in a persistent, visual "state-space." SciWeb's AI features are tightly integrated with this map, providing novel insights, expansions, and support that are always grounded in the user's current understanding and goals.

## Core User Experience

### Onboarding
- **Purpose:** Make users feel deeply supported and understood from the first touchpoint.
- **Flow:**
  1. **Sign Up:** Simple, animated, welcoming UI. No grade level required.
  2. **Email Verification:** Functional, but keeps the same UI.
  3. **User Type Selection:** (MS/HS student, college/grad student, career professional) with institution, grade/year, and major/career as appropriate.
  4. **Motivations & Goals:** Conversational AI asks follow-up questions until it has enough information to create a personalized setup. The AI is supportive and inspirational, and the output is presented as visually engaging, animated "cards."
  5. **Experience Page:** Cinematic explanation of how SciWeb works, contextualized to the user's goals.
  6. **Customization:** Users select from a curated library of node types (and can create custom ones), dragging them into their "lineup." They customize color, icon, and features for each node type. No live preview; the result is revealed at the end.
  7. **Introduction to Features:** Briefly introduces grade analysis, classes, and other features.

### MyWeb Page
- **Central Hub:** Each user's MyWeb is a persistent, database-backed map representing their "state-space."
- **Initialization:** The map is initialized during onboarding with the user's core motivations and chosen node types.
- **Interaction:**
  - Nodes are added via voice mode (transcribing and integrating spoken ideas) or manually (drag-and-drop, direct editing).
  - Clicking or hovering on nodes reveals type, description, and visually prominent AI-driven enrichment/expansion options.
  - Expansions generate new, connected nodes that provide novel insights or prompt deeper thinking—no accept/reject step, but users can edit or reorganize as needed.
  - The map is highly customizable, and users can edit node types, descriptions, and even AI prompts for enrichments.

### Node Types & Features
- **Core Node Types:**
  - **Motivator:** Represents core drives and goals. Often at the top of the map. Can be "reinvigorated" by AI.
  - **Task:** Concrete actions with due/target dates. AI can break into sub-tasks or suggest how to proceed.
  - **Challenge:** Represents obstacles or conceptual challenges. AI can help contextualize, avert, or solve.
  - **Counselor:** AI chatbot with preset instructions, for accountability and motivation. Can set tasks/goals and access grades.
  - **Class, Assignment, Test, Project, Essay, Goal:** Academic nodes, each with links to dedicated pages and features (e.g., grade analysis, peer review, AI scoring, collaboration).
  - **Learning Objective:** Guides understanding of a topic/unit. Has a settings panel for customizing the learning experience. Clicking the node generates connected nodes (key ideas, questions, problem types) based on settings.
  - **Key Idea, Question, Problem Type:** Learning nodes that branch from learning objectives. AI can generate, expand, and quiz. Problem types link to practice modules with right/wrong tracking.
  - **Idea Node:** The default, catch-all node for anything not fitting other types.
  - **Image Node:** For personalization, no special features.

- **Node Features:**
  - All nodes have a hover window with features/options, including remove, connect, and edit.
  - Expansion/enrichment options are visually prominent in the hover menu.
  - Subnodes (e.g., key ideas, questions) also have their own expansion options.

### AI Integration
- **Voice Mode:** Users can speak to add ideas; the AI transcribes and fits input into node types, defaulting to "idea" nodes if uncertain. Ambiguous input is added as detached nodes for user organization.
- **Expansions/Enrichments:** AI analyzes the map to find gaps, suggest new perspectives, and trigger "aha!" moments. Mistakes are opportunities for users to clarify and expand their map.
- **Learning Objective Nodes:** Clicking triggers AI to generate connected nodes based on user-configured settings (e.g., level of detail, guidance, suggestion frequency). Progress is tracked via a progress bar, updated as related nodes are added.
- **Practice/Problem Type Nodes:** AI generates practice problems, tracks right/wrong answers, and can adapt difficulty. Explanations and hints can be provided.

### Learning & Studying System
- **Learning Objective Nodes:**
  - Serve as hubs for building out understanding of a topic.
  - Settings panel allows full customization of the learning experience.
  - Clicking generates only directly connected nodes, with types and content determined by settings and map context.
  - Progress bar reflects map completeness around the objective.
  - Users can change settings or refocus objectives at any time; progress recalculates accordingly.
  - No archiving or review of past sessions for now.

- **Practice Modules:**
  - Linked from problem type nodes.
  - Users can solve AI-generated problems, track performance, and request hints or solutions.

### Collaboration & Social Features
- **Project Nodes:**
  - Shared among collaborators; all have equal editing rights.
  - The same project node appears on each collaborator's map, and all child nodes are synchronized.
- **Motivation Feed:**
  - Public, social-media-like stream of motivator nodes and inspiration boards.
  - Users can view, react, and leave supportive comments (all comments filtered by a lightweight LLM for positivity).
  - No full map sharing; sharing is node-based and controlled by the user.
- **No notifications** in the MVP; users see updates by visiting relevant nodes/pages.

### User Control & Adaptability
- **Maximum Freedom:**
  - Users are guided during onboarding and customization, but are free to structure their map as they wish.
  - No required nodes, but best practices are suggested.
  - Users can edit node types, descriptions, and AI prompts to ensure the map reflects their thinking.
  - Feedback options allow users to explain why an AI suggestion was unhelpful, directly modifying the map.
- **Transparency:**
  - The more specific and complete the map, the more helpful the AI becomes.
  - The map is a living, evolving representation of both the user's thinking and the AI's understanding.

### MVP Priorities
1. **Onboarding flow** (with node/map customization and motivational AI conversation)
2. **MyWeb page** (voice mode, expansion features)
3. **Node-specific pages** (project, class, essay, etc.)
4. **Motivation feed**
5. Additional features and refinements

### Technical Notes
- The core framework and MyWeb page are already implemented; onboarding is the next major focus.
- The platform is designed for asynchronous collaboration and feedback, not real-time editing.
- No notification system in the MVP.

---

This document serves as the comprehensive master plan for SciWeb's design and development, synthesizing all key ideas, features, and user experience principles discussed to date. 