# The first draft is free. The second one is the work.

The client asks for one change, and the export can’t make it. The file looks finished and plays well, and it has no way back to the decision inside it.

That used to be a nuisance. I think it has become a central problem. Generative tools have pushed the cost of a competent draft close to zero, and what stays scarce is knowing what should be made. I’ve been testing that idea in public as [the imagination economy](https://imagination-economy.org/glossary/imagination-economy), a phrase that isn’t mine and [goes back at least to Geoffrey Colvin in Fortune in 2006](https://imagination-economy.org/glossary/history-of-the-term). But you often learn what should be made by trying to change a draft. A draft you can only accept or regenerate gives you a choice. A draft you can open gives you a direction to take.

FluxCreate is my attempt to build for the second kind of draft, and I’ve now made it [public on GitHub](https://github.com/AlexanderCGO2/fluxcreate). It’s an early suite of eight browser-based studios: FluxFoto for photo editing, FluxDesign for page layout, FluxVideo for video, FluxMotion for animation and compositing, FluxEffects for procedural scenes, Flux3D for 3D, FluxLab for AI generation and FluxAgents for workflows. You can clone it and run it locally, or [open the demo](https://fluxcreate-public-demo.vercel.app/) and edit a layered poster, an illustrated publication, a motion study or a 3D scene. AI generation is off in the demo.

I built FluxCreate with AI coding agents, and I answer for what’s in it. I also co-founded FLUX AI and CRAISEE, so I have a stake in this argument.

## The objection to my own argument

If making is cheap, why build eight more editors?

In October, Brandon Thomas’s ArtCraft project drew attention for open-source editors built with AI, including PhotoCraft for photo editing and EffectCraft for motion and compositing. Ars Technica’s headline quoted the pitch: “Software is over.” That supports the idea that the cost of making has collapsed. It’s also a problem for me, because it suggests editors themselves are getting cheaper.

My answer is that the editor isn’t the scarce part. The way back is. That doesn’t mean FluxCreate is ahead on every file. PhotoCraft documents type layers that round-trip through PSD. FluxFoto exports PSD as pixel layers, and its text, shapes, masks and adjustment controls stay editable only in the FluxFoto project. The question I’m working on is narrower: what can stay editable as one project moves between studios?

## What the way back looks like

In FluxVideo, Autoedit takes source clips and a soundtrack and builds an automatic draft on your machine. An optional AI pass reviews a limited selection of frames and musical features, using credits from a connected account, and proposes changes with its reasons. Either way, I end up with an editable timeline. I can swap a shot, trim a clip or give a quiet moment more room before I export. I count that trim as direction. It’s where a vague preference becomes [a decision I can explain](https://imagination-economy.org/glossary/director-mode).

Now take a scene from FluxEffects to FluxMotion. Simple text and shapes arrive as objects I can edit, with their position, color and opacity. Simulations, cameras and lights don’t convert. They stay in the handoff, a Markdown file with a readable brief and a complete snapshot of the FluxEffects project, up to 16 MB. When I bring that file back to FluxEffects, I can convert the latest FluxMotion scene or restore the saved original, and the dialog warns that restoring leaves out the later FluxMotion edits.

A PDF opened in FluxDesign has no such way back. Each page arrives as an image of up to 144 dpi. Its text and paths can’t be edited, though I can add new frames above it. That’s fine when I need the page’s appearance and wrong when I plan to revise its typography, so the difference should be plain before anyone starts.

## Where AI fits

Core editing works without an AI key. If you want to generate text, images, video, speech or music, you can connect a provider in FluxLab, which may cost money, and bring the results into a studio. FluxLab also exposes MCP tools.

Once a workflow runs repeatedly, different questions matter. What did it use as input? Which step needed approval? Where did it put the result? FluxAgents can save workflow versions, approvals and outputs for local runs. Hosted, unattended execution is still ahead.

## Why open it now

The first people to try a tool bring files and habits I didn’t design for. I want them to be able to reproduce an import issue, trace a handoff through the code or propose a better way to preserve part of a document.

There’s a second reason. When execution gets cheap, it matters more who owns the tools and who can read the files. The apps use AGPL-3.0-only, so changes to them stay open under its terms. The FluxExchange handoff package uses Apache-2.0, so other tools can build on it. Both licenses allow commercial use, and FluxCreate may offer paid hosting, AI usage or support later. None of that is on offer today.

## How I could be wrong

If people take the first pass and never reopen it, or find regenerating faster than revising, then I’ve built the wrong thing.

So try it with a file you know well. Import it, change something, and take it into another studio or export it. Tell me which part you expected to stay editable and where you lost the way back. An example I can reproduce is the most useful feedback at this stage. [Open an issue on GitHub](https://github.com/AlexanderCGO2/fluxcreate/issues), or leave a comment here.

Making got cheap. Changing your mind still costs whatever the file allows.

## Sources

- [Ars Technica on ArtCraft](https://arstechnica.com/ai/2026/10/software-is-over-bold-ai-developer-takes-aim-at-adobe-with-open-source-clones/)
- [PhotoCraft’s PSD documentation](https://github.com/storytold/photocraft#psd-without-compromise)
- [EffectCraft](https://github.com/storytold/effectcraft)
- [FluxCreate file compatibility](https://github.com/AlexanderCGO2/fluxcreate#file-compatibility)
- [FluxDesign import limits](https://github.com/AlexanderCGO2/fluxcreate/blob/main/Fluxidesign/README.md#adobe-documents)
- [What FluxExchange transfers](https://github.com/AlexanderCGO2/fluxcreate/blob/main/FluxExchange/README.md#what-transfers)
- [FluxCreate licensing](https://github.com/AlexanderCGO2/fluxcreate/blob/main/docs/LICENSING.md)
