/**
 * portfolio-data.js
 * Centralized, easily-editable portfolio content.
 * Edit the values here - no need to touch any rendering code.
 */

const PORTFOLIO_DATA = {

  about: {
    name: "Rosemay", // TODO: replace with your actual name if different
    role: "Computer Science Student & Aspiring Developer",
    intro:
      "Hi, I'm Rosemay! I'm a Computer Science student who loves building things that make life a little easier - and a little cuter. This room is my digital corner: part portfolio, part cozy hideout.",
    enjoys: [
      "Building small, useful web apps",
      "Turning messy data into clear insights",
      "Designing interfaces that feel warm and friendly",
    ],
    goals: [
      "Grow as a full-stack developer",
      "Get better at machine learning and data analysis",
      "Build products that people genuinely enjoy using",
    ],
  },

  projects: [
    {
      name: "Quizify",
      description:
        "A web-based learning platform where students can upload learning modules, generate quizzes, use flashcards, view quiz history, and track study analytics.",
      technologies: ["Python", "FastAPI", "MySQL", "JavaScript"],
      status: "In Progress", // e.g. "In Progress" | "Completed" | "Planned"
      github: "", // TODO: add GitHub URL
      demo: "", // TODO: add live demo URL
    },
    {
      name: "EchoSent",
      description:
        "A web-based student feedback analysis system that analyzes student evaluations and classifies feedback into Positive, Neutral, or Negative sentiment.",
      technologies: ["Python", "Machine Learning", "Data Analysis"],
      status: "In Progress",
      github: "", // TODO: add GitHub URL
      demo: "", // TODO: add live demo URL
    },
  ],

  skills: {
    Programming: ["Python", "JavaScript", "HTML", "CSS"],
    Backend: ["FastAPI"],
    Database: ["MySQL"],
    "Data / AI": ["Machine Learning", "Data Analysis"],
    Tools: ["Git", "GitHub"],
    Design: ["UI/UX"],
  },

  hobbies: [
    { icon: "\u{1f3ae}", label: "Gaming" },
    { icon: "\u{1f3a8}", label: "Drawing" },
    { icon: "\u{1f3a4}", label: "Singing" },
    { icon: "\u{1f483}", label: "Dancing" },
    { icon: "\u{1f3ac}", label: "Watching movies" },
  ],

  education: [
    {
      title: "BS Computer Science", // TODO: confirm exact program title
      period: "In progress", // TODO: add years
      description: "Currently studying Computer Science, focusing on software development, databases, and data-driven applications.",
    },
    // Add more entries here (experience, certifications, etc.)
  ],

  funFacts: [
    "I enjoy cozy games.",
    "I like drawing.",
    "I enjoy singing and dancing.",
    "I like exploring creative projects.",
  ],

  currentlyLearning: [
    { icon: "\u{1f331}", stage: "Learning", label: "React" },
    { icon: "\u{1f331}", stage: "Learning", label: "UI/UX Design" },
    { icon: "\u{1f33f}", stage: "Practicing", label: "Data Analysis" },
    { icon: "\u{1f33f}", stage: "Practicing", label: "Machine Learning" },
  ],

  contact: {
    email: "rosierosie0909@gmail.com", // TODO: add your email
    github: "https://github.com/rowseiyyyy", // TODO: add your GitHub profile URL
    linkedin: "", // TODO: add your LinkedIn URL
    other: [], // e.g. [{ label: "Twitter", url: "" }]
  },

  clutter: {
  guitar:       { icon: "🎸", title: "Guitar", subtitle: "Music corner", text: "I sing and play around with songs when I need a break from coding." },
  floorlamp:    { icon: "💡", title: "Floor Lamp", subtitle: "Cozy lighting", text: "The warm glow keeps late-night coding sessions comfy." },
  basket:       { icon: "🧺", title: "Blanket Basket", subtitle: "Comfort station", text: "Soft blankets for debugging at midnight." },
  boxes:        { icon: "📦", title: "Boxes", subtitle: "Ideas in storage", text: "Half-finished project ideas waiting for their turn." },
  bookstack1:   { icon: "📚", title: "Book Stack", subtitle: "Reading pile", text: "Programming books and notes I keep coming back to." },
  bookstack2:   { icon: "📖", title: "Another Stack", subtitle: "Still reading", text: "Always more to learn than shelf space." },
  shoes:        { icon: "👟", title: "Sneakers", subtitle: "Ready to dance", text: "Dancing is how I reset my brain." },
  backpack:     { icon: "🎒", title: "Backpack", subtitle: "Student life", text: "Laptop, notebook, snacks. The CS student starter pack." },
  skateboard:   { icon: "🛹", title: "Skateboard", subtitle: "Someday", text: "On my list of things to learn." },
  bin:          { icon: "🗑️", title: "Waste Bin", subtitle: "Failed attempts", text: "Crumpled drafts. Every project has a few. One paper ball missed, of course." },
  pouf:         { icon: "🛋️", title: "Pouf", subtitle: "Thinking spot", text: "Where I sit when I'm stuck on a problem." },
  cushions:     { icon: "🧸", title: "Floor Cushions", subtitle: "Game time", text: "Perfect for cozy gaming sessions." },
  recordplayer: { icon: "🎶", title: "Record Player", subtitle: "Now playing", text: "Music keeps me focused while I build things." },
  records:      { icon: "💿", title: "Vinyl Records", subtitle: "Favorites", text: "A small collection of songs I love." },
  pencilcup:    { icon: "✏️", title: "Pencil Cup", subtitle: "Drawing", text: "Pencils for sketching UI ideas and doodles." },
  deskbooks:    { icon: "📓", title: "Desk Books", subtitle: "Reference", text: "Quick references and a mug on top, of course." },
  deskplant:    { icon: "🪴", title: "Desk Plant", subtitle: "Growing", text: "A tiny reminder to keep growing." },
  candle:       { icon: "🕯️", title: "Candle", subtitle: "Mood lighting", text: "Lit for the cozy atmosphere." },
  headphones:   { icon: "🎧", title: "Headphones", subtitle: "Focus mode", text: "On whenever I'm deep in code." },
  notebook:     { icon: "📝", title: "Notebook", subtitle: "Plans", text: "Sketches, to-do lists, and project plans." },
  speaker:      { icon: "🔊", title: "Speaker", subtitle: "Sound", text: "Background music for building and singing along." },
  coffee:       { icon: "☕", title: "Coffee Cup", subtitle: "Fuel", text: "Powers many late-night coding sessions." },
  keyboard:     { icon: "⌨️", title: "Keyboard", subtitle: "Where it happens", text: "Most of my projects started here." },
  clock:        { icon: "🕒", title: "Wall Clock", subtitle: "Time", text: "Always later than I think it is." },
  hooks:        { icon: "🧥", title: "Hoodie & Tote", subtitle: "Essentials", text: "My go-to cozy hoodie for the cold study nights." },
  nightstand:   { icon: "🛏️", title: "Nightstand", subtitle: "Wind down", text: "Lamp, alarm clock, and a book for before bed." },
  bed:          { icon: "😴", title: "Bed", subtitle: "Recharge", text: "Sleep is part of the process. The cat agrees." },
  window:       { icon: "🪟", title: "Window", subtitle: "The view", text: "Day or night, a good place to rest my eyes." },
  hangplant:    { icon: "🌿", title: "Hanging Plant", subtitle: "Greenery", text: "A little life for the room." },
  stringlights: { icon: "✨", title: "String Lights", subtitle: "Ambience", text: "They make the whole room feel warm." },
  gallery:      { icon: "🖼️", title: "Wall Gallery", subtitle: "Art", text: "Little frames of things I like, including my drawings." },
  wallshelf:    { icon: "🏺", title: "Floating Shelf", subtitle: "Trinkets", text: "Small things that make the room feel like mine." },
  dogbowls:     { icon: "🦴", title: "Pet Bowls", subtitle: "Snack time", text: "Never skip the dog's dinner." },
},
};