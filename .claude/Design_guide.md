Design Specification: The Rationalist (Swiss Structure)

Theme Codename: Rationalist / Swiss Structure
Visual Philosophy: Authoritative, rigid, and institutional. This design mimics the aesthetic of established university portals or corporate research tools. It prioritizes structure over flair, using strong contrast and strict rectangular geometry to convey reliability.

1. Core Color System

The palette is high-contrast and professional, relying on a "Structural Gray" background to make white content blocks pop, anchored by a deep "Academic Blue".

Base Layers

App Background: Neutral-200 (#e5e5e5) - A distinct structural gray, not white. This creates a "workspace" feel.

Content Surface: White (#ffffff) - Used for cards and panels.

Text (Body): Neutral-800 (#1f2937) - Dark charcoal for high readability.

Brand Colors (The Authority)

Primary Brand: Blue-900 (#1e3a8a) - A deep, navy-like blue. Used for navigation, primary buttons, and heavy borders.

Secondary/Hover: Blue-800 (#1e40af) - Slight lift for interactive states.

Subtle Accent: Blue-100 (#dbeafe) - Used for badges and backgrounds of secondary elements.

Functional Colors

Borders: Neutral-300 (#d4d4d4) for standard dividers; Blue-900 for emphasis.

Inputs: White background with Neutral-300 border.

2. Shape Language & Geometry

Rule of Thumb: Zero border radius. Everything is a box.

Corner Radius: rounded-none (0px) applied to ALL elements: cards, buttons, inputs, avatars, and badges.

Borders:

The "spine": Cards typically feature a heavy left border (border-l-4) in Blue-900 to simulate a filed folder or book spine.

Standard borders: 1px solid Neutral-300 for inputs and secondary buttons.

3. Typography

Font Family: Standard Sans-Serif (Inter/Roboto/Helvetica). No serifs, no monospaced fonts (except code).

Weights:

Body: Regular (400).

Headings: Bold (700) or ExtraBold (800) for "Accent Text".

Key Style: Accent Text should be Blue-900 and font-extrabold to denote importance (e.g., active section, grades).

4. Component Specifications

Navigation Bar

Style: Solid, heavy bar.

Classes: bg-blue-900 text-white shadow-md.

Structure: spans the full width. No floating, no glassmorphism.

Cards & Containers

Visual Metaphor: Physical index cards or dossiers.

Base Style: bg-white shadow-sm p-8.

The "Spine" Accent: border-l-4 border-blue-900.

Interaction: hover:translate-x-1 transition-transform. The card physically shifts right on hover, acknowledging the "spine".

Buttons

Primary Action:

bg-blue-900 text-white

rounded-none px-6 py-3

font-medium

hover:bg-blue-800

Secondary Action:

bg-white text-blue-900

border border-blue-900

hover:bg-blue-50

Input Fields

Style: Boxy and standard.

Classes: bg-white border border-neutral-300 p-3 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900.

Status Badges

Style: High contrast, legible.

Classes: bg-blue-100 text-blue-900 font-bold px-2 py-1 text-xs rounded-none.

Special Element: The Advisor/Alert Box

Style: High visibility, outlined.

Classes: bg-white border-2 border-blue-900 text-blue-900 p-6 rounded-none.

5. Layout Implementation (React/Tailwind Example)

// Card Component Example
<div className="bg-white border-l-4 border-blue-900 shadow-sm p-8 rounded-none hover:translate-x-1 transition-transform duration-200">
  
  {/* Header */}
  <div className="flex justify-between items-start mb-4">
    <h3 className="text-xl font-bold text-neutral-800">Research Methods</h3>
    <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2 py-1 uppercase">
      Active
    </span>
  </div>

  {/* Content */}
  <p className="text-neutral-600 mb-6">
    Module 4: Quantitative Analysis
  </p>

  {/* Progress Bar */}
  <div className="w-full bg-neutral-200 h-1 rounded-none mb-2">
    <div className="bg-blue-900 h-1 rounded-none" style={{ width: '75%' }}></div>
  </div>
  
</div>
