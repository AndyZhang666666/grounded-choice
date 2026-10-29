# Grounded Choice

[中文](README.md) · [Project index](https://github.com/AndyZhang666666/AndyZhang666666/blob/main/PROJECTS.en.md) · [Live demo](https://andyzhang666666.github.io/grounded-choice/)

Which advice applies when experiences conflict and personal constraints matter?

![Actual Grounded Choice interface](https://andyzhang666666.github.io/assets/work/showcase/grounded-crop.jpg)

## Product decisions

- Keep sources, agreements, disagreements and applicability together.
- Expose hard-constraint violations instead of hiding them behind a recommendation.
- Separate recommendations from the user’s selected decision.

## Walkthrough

1. Choose the travel or robot-vacuum scenario and inspect the simulated sources.
2. Change the included sources and inspect the brief and disagreements.
3. Compare costs and constraints, choose a proposal and export the decision card.

## Run mode and limits

An interactive prototype using original simulated sources, without live search or automatic commerce-price comparison. A restricted-use portfolio project; see LICENSE.

## Run locally

```sh
python3 -m http.server 8870 --bind 127.0.0.1
node .tests/test.mjs
```

Open `http://127.0.0.1:8870/`. No npm dependencies or build step.

## Lightweight checks

```sh
node .tests/test.mjs
```

These commands are provided for reproduction; this documentation update did not run a new model benchmark.

## Documentation

- [Usage terms](LICENSE)
- [Implementation details and original records, Chinese](README.md)

Use the repository’s existing licence and notices. This update does not change usage rights.
