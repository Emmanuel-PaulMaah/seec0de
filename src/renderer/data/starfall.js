// Starfall — a junior Python/pygame build project.
//
// Two files, deliberately split: `game.py` is pure logic with no pygame import,
// so every rule can be run and checked headlessly; `main.py` is the pygame
// shell that draws it and reads the keyboard. The round is 45 seconds, so a
// Run finishes inside the runner's interactive budget.

const starfall = {
  id: 'starfall',
  title: 'Starfall',
  language: 'python',
  level: 'junior',
  summary: 'Build a 45-second arcade catcher with pygame: fly a ship, catch stars, dodge bombs, and track lives.',
  brief: 'Model the board and player, spawn and move falling objects, score catches and collisions, then draw and drive it all with a pygame loop.',
  concepts: ['pygame', 'game loop', 'state', 'collision', 'random', 'functions'],
  scaffold: [
    {
      file: 'game.py',
      content: `"""Starfall — pure game logic. Run: python game.py"""

WIDTH = 480
HEIGHT = 640
PLAYER_WIDTH = 64
PLAYER_SPEED = 320
ROUND_SECONDS = 45
SPAWN_EVERY = 0.6

# TODO: clamp the player inside the board.

if __name__ == "__main__":
    print("Board:", WIDTH, "x", HEIGHT)
`,
    },
    {
      file: 'main.py',
      content: `"""Starfall — the pygame shell. Run: python main.py"""

import pygame

from game import HEIGHT, PLAYER_WIDTH, ROUND_SECONDS, WIDTH


def draw(screen, player_x, stars, state, time_left, font):
    # TODO: fill the background, draw the ship, the falling stars, and the HUD.
    pass


def main():
    # TODO: open the window, run the event loop, and call draw every frame.
    pass


if __name__ == "__main__":
    main()
`,
    },
    {
      file: 'requirements.txt',
      content: `pygame>=2.5
`,
    },
  ],
  steps: [
    {
      id: 'starfall-1-board',
      title: 'Clamp the ship to the board',
      file: 'game.py',
      task: 'Add a `clamp_player(x)` function so the 64 px ship can never leave the 480×640 board — its centre stops at x=32 on the left and x=448 on the right. Run `game.py`: the demo should print `Clamped left: 32.0` and `Clamped right: 448.0`.',
      examples: [
        { label: 'The clamp', code: 'def clamp_player(x):\n    half = PLAYER_WIDTH / 2\n    return max(half, min(WIDTH - half, x))' },
        { label: 'Demo lines', code: 'print("Clamped left:", clamp_player(-50))\nprint("Clamped right:", clamp_player(999))' },
      ],
      hints: [
        'The centre can get no closer than half the ship width to either edge.',
        'max(low, min(high, value)) clamps a number in one line.',
      ],
      checks: [
        { id: 'has-clamp', type: 'hasFunction', file: 'game.py', name: 'clamp_player' },
        { id: 'uses-max', type: 'fileContains', file: 'game.py', pattern: 'max\\(' },
        { id: 'clamps-left', type: 'runOutput', file: 'game.py', expect: 'Clamped left: 32.0', match: 'contains' },
        { id: 'clamps-right', type: 'runOutput', file: 'game.py', expect: 'Clamped right: 448.0', match: 'contains' },
      ],
      solution: `"""Starfall — pure game logic. Run: python game.py"""

WIDTH = 480
HEIGHT = 640
PLAYER_WIDTH = 64
PLAYER_SPEED = 320
ROUND_SECONDS = 45
SPAWN_EVERY = 0.6


def clamp_player(x):
    half = PLAYER_WIDTH / 2
    return max(half, min(WIDTH - half, x))


if __name__ == "__main__":
    print("Board:", WIDTH, "x", HEIGHT)
    print("Clamped left:", clamp_player(-50))
    print("Clamped right:", clamp_player(999))
`,
    },
    {
      id: 'starfall-2-falling',
      title: 'Make the stars fall',
      file: 'game.py',
      task: 'Add `spawn_star(rng)` — a dictionary with `x`, `y=-20`, `size=16`, a `kind` of `"star"` or `"bomb"`, and a speed — plus `update_stars(stars, dt)` that moves each star down and drops the ones past the bottom. In the demo, a star at y=0 moving 200 px/s for 0.5 s should print `Star y: 100.0`.',
      examples: [
        { label: 'Spawn one', code: `def spawn_star(rng):
    return {
        "x": rng.uniform(0, WIDTH),
        "y": -20,
        "size": 16,
        "kind": "star" if rng.random() < 0.8 else "bomb",
        "speed": rng.uniform(120, 220),
    }` },
        { label: 'Move and prune', code: `def update_stars(stars, dt):
    for star in stars:
        star["y"] += star["speed"] * dt
    return [star for star in stars if star["y"] < HEIGHT + 20]` },
        { label: 'Demo lines', code: 'star = {"x": 100, "y": 0, "size": 16, "kind": "star", "speed": 200}\nupdate_stars([star], 0.5)\nprint("Star y:", star["y"])' },
      ],
      hints: [
        'Mutate each star dictionary in place — main.py draws the same objects.',
        'A list comprehension keeps only the stars still on (or just past) the screen.',
      ],
      checks: [
        { id: 'has-spawn', type: 'hasFunction', file: 'game.py', name: 'spawn_star' },
        { id: 'has-update', type: 'hasFunction', file: 'game.py', name: 'update_stars' },
        { id: 'moves-down', type: 'runOutput', file: 'game.py', expect: 'Star y: 100.0', match: 'contains' },
      ],
      solution: `"""Starfall — pure game logic. Run: python game.py"""

WIDTH = 480
HEIGHT = 640
PLAYER_WIDTH = 64
PLAYER_SPEED = 320
ROUND_SECONDS = 45
SPAWN_EVERY = 0.6


def clamp_player(x):
    half = PLAYER_WIDTH / 2
    return max(half, min(WIDTH - half, x))


def spawn_star(rng):
    return {
        "x": rng.uniform(0, WIDTH),
        "y": -20,
        "size": 16,
        "kind": "star" if rng.random() < 0.8 else "bomb",
        "speed": rng.uniform(120, 220),
    }


def update_stars(stars, dt):
    for star in stars:
        star["y"] += star["speed"] * dt
    return [star for star in stars if star["y"] < HEIGHT + 20]


if __name__ == "__main__":
    print("Board:", WIDTH, "x", HEIGHT)
    print("Clamped left:", clamp_player(-50))
    print("Clamped right:", clamp_player(999))

    star = {"x": 100, "y": 0, "size": 16, "kind": "star", "speed": 200}
    update_stars([star], 0.5)
    print("Star y:", star["y"])
`,
    },
    {
      id: 'starfall-3-catch',
      title: 'Catch stars, lose lives',
      file: 'game.py',
      task: 'Add `caught(player_x, star)`, `apply_catch(state, star)`, and `is_over(lives)`. A catch happens when the star is within half the combined widths and in the bottom 80 px; stars add 10 points, bombs remove a life, and zero lives ends the game. Run it: `Caught: True`, `Score: 10`, `Lives: 2`, `Game over: True`.',
      examples: [
        { label: 'Catch test', code: `def caught(player_x, star):
    return (
        abs(star["x"] - player_x) <= (PLAYER_WIDTH + star["size"]) / 2
        and star["y"] >= HEIGHT - 80
    )` },
        { label: 'Apply the result', code: `def apply_catch(state, star):
    if star["kind"] == "star":
        state["score"] += 10
    else:
        state["lives"] -= 1
    return state` },
        { label: 'Demo lines', code: 'state = {"score": 0, "lives": 3}\napply_catch(state, {"x": 240, "y": 600, "size": 16, "kind": "star"})\nprint("Score:", state["score"])\napply_catch(state, {"x": 240, "y": 600, "size": 16, "kind": "bomb"})\nprint("Lives:", state["lives"])\nprint("Caught:", caught(240, {"x": 240, "y": 600, "size": 16}))\nprint("Game over:", is_over(0))' },
      ],
      hints: [
        'The ship sits at the bottom of the screen, so only stars in the last 80 px can be caught.',
        'Keep state in a dictionary — main.py passes the same one to every function.',
      ],
      checks: [
        { id: 'has-caught', type: 'hasFunction', file: 'game.py', name: 'caught' },
        { id: 'has-apply', type: 'hasFunction', file: 'game.py', name: 'apply_catch' },
        { id: 'has-over', type: 'hasFunction', file: 'game.py', name: 'is_over' },
        { id: 'catches', type: 'runOutput', file: 'game.py', expect: 'Caught: True', match: 'contains' },
        { id: 'scores', type: 'runOutput', file: 'game.py', expect: 'Score: 10', match: 'contains' },
        { id: 'loses-life', type: 'runOutput', file: 'game.py', expect: 'Lives: 2', match: 'contains' },
        { id: 'game-over', type: 'runOutput', file: 'game.py', expect: 'Game over: True', match: 'contains' },
      ],
      solution: `"""Starfall — pure game logic. Run: python game.py"""

WIDTH = 480
HEIGHT = 640
PLAYER_WIDTH = 64
PLAYER_SPEED = 320
ROUND_SECONDS = 45
SPAWN_EVERY = 0.6


def clamp_player(x):
    half = PLAYER_WIDTH / 2
    return max(half, min(WIDTH - half, x))


def spawn_star(rng):
    return {
        "x": rng.uniform(0, WIDTH),
        "y": -20,
        "size": 16,
        "kind": "star" if rng.random() < 0.8 else "bomb",
        "speed": rng.uniform(120, 220),
    }


def update_stars(stars, dt):
    for star in stars:
        star["y"] += star["speed"] * dt
    return [star for star in stars if star["y"] < HEIGHT + 20]


def caught(player_x, star):
    return (
        abs(star["x"] - player_x) <= (PLAYER_WIDTH + star["size"]) / 2
        and star["y"] >= HEIGHT - 80
    )


def apply_catch(state, star):
    if star["kind"] == "star":
        state["score"] += 10
    else:
        state["lives"] -= 1
    return state


def is_over(lives):
    return lives <= 0


if __name__ == "__main__":
    print("Board:", WIDTH, "x", HEIGHT)
    print("Clamped left:", clamp_player(-50))
    print("Clamped right:", clamp_player(999))

    star = {"x": 100, "y": 0, "size": 16, "kind": "star", "speed": 200}
    update_stars([star], 0.5)
    print("Star y:", star["y"])

    state = {"score": 0, "lives": 3}
    apply_catch(state, {"x": 240, "y": 600, "size": 16, "kind": "star"})
    print("Caught:", caught(240, {"x": 240, "y": 600, "size": 16}))
    print("Score:", state["score"])
    apply_catch(state, {"x": 240, "y": 600, "size": 16, "kind": "bomb"})
    print("Lives:", state["lives"])
    print("Game over:", is_over(0))
`,
    },
    {
      id: 'starfall-4-window',
      title: 'Open the pygame window',
      file: 'main.py',
      setup: ['python -m pip install pygame'],
      task: 'Wire up `main()`: call `pygame.init()`, open a 480×640 window titled Starfall, create a clock and a font, then draw the ship, any stars, and the HUD every frame. Press Run to see the window — close it to stop.',
      examples: [
        { label: 'Window setup', code: `pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Starfall")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 30)` },
        { label: 'Draw the ship', code: `pygame.draw.rect(
    screen,
    PLAYER_COLOR,
    pygame.Rect(int(player_x - PLAYER_WIDTH / 2), HEIGHT - 48, PLAYER_WIDTH, 16),
    border_radius=8,
)` },
      ],
      hints: [
        'If pygame is missing, run `python -m pip install pygame` in the Terminal (use `python3` on macOS or Linux if needed).',
        'Call `pygame.display.flip()` once per frame, after drawing.',
        'The ship is centred on `player_x`, so its rectangle starts at `player_x - PLAYER_WIDTH / 2`.',
      ],
      checks: [
        { id: 'inits', type: 'fileContains', file: 'main.py', pattern: 'pygame\\.init\\(\\)' },
        { id: 'window', type: 'fileContains', file: 'main.py', pattern: 'pygame\\.display\\.set_mode' },
        { id: 'draws', type: 'fileContains', file: 'main.py', pattern: 'def draw' },
        { id: 'flips', type: 'fileContains', file: 'main.py', pattern: 'pygame\\.display\\.flip' },
      ],
      solution: `"""Starfall — the pygame shell. Run: python main.py"""

import pygame

from game import HEIGHT, PLAYER_WIDTH, ROUND_SECONDS, WIDTH

BG = (10, 12, 22)
PLAYER_COLOR = (124, 240, 212)
STAR_COLOR = (255, 209, 102)
BOMB_COLOR = (255, 92, 122)
TEXT_COLOR = (226, 232, 245)


def draw(screen, player_x, stars, state, time_left, font):
    screen.fill(BG)
    pygame.draw.rect(
        screen,
        PLAYER_COLOR,
        pygame.Rect(int(player_x - PLAYER_WIDTH / 2), HEIGHT - 48, PLAYER_WIDTH, 16),
        border_radius=8,
    )
    for star in stars:
        color = STAR_COLOR if star["kind"] == "star" else BOMB_COLOR
        pygame.draw.circle(screen, color, (int(star["x"]), int(star["y"])), star["size"] // 2)
    hud = "Score " + str(state["score"]) + "    Lives " + str(state["lives"]) + "    " + str(max(0, int(time_left))) + "s"
    screen.blit(font.render(hud, True, TEXT_COLOR), (18, 16))


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Starfall")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 30)

    player_x = WIDTH / 2
    stars = []
    state = {"score": 0, "lives": 3}
    time_left = ROUND_SECONDS
    running = True

    while running:
        clock.tick(60)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        draw(screen, player_x, stars, state, time_left, font)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
`,
    },
    {
      id: 'starfall-5-play',
      title: 'Drive the game',
      file: 'main.py',
      task: 'Complete the loop: the arrow keys or A/D move the ship, a spawn timer adds stars, collisions call `apply_catch`, the 45-second clock counts down, and R restarts after a loss or timeout. Press Run and play a round.',
      examples: [
        { label: 'Read held keys', code: `keys = pygame.key.get_pressed()
if keys[pygame.K_LEFT] or keys[pygame.K_a]:
    player_x = clamp_player(player_x - PLAYER_SPEED * dt)
if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
    player_x = clamp_player(player_x + PLAYER_SPEED * dt)` },
        { label: 'Spawn and collide', code: `spawn_timer += dt
if spawn_timer >= SPAWN_EVERY:
    spawn_timer = 0.0
    stars.append(spawn_star(rng))

stars = update_stars(stars, dt)
for star in list(stars):
    if caught(player_x, star):
        apply_catch(state, star)
        stars.remove(star)` },
      ],
      hints: [
        'Convert the clock to seconds: `dt = min(clock.tick(60) / 1000, 0.05)`.',
        'Iterate over `list(stars)` when removing items so the loop sees a stable copy.',
        'Only move and spawn while `not is_over(state["lives"]) and time_left > 0`.',
      ],
      checks: [
        { id: 'events', type: 'fileContains', file: 'main.py', pattern: 'pygame\\.event\\.get' },
        { id: 'keys', type: 'fileContains', file: 'main.py', pattern: 'pygame\\.K_LEFT' },
        { id: 'moves', type: 'fileContains', file: 'main.py', pattern: 'update_stars' },
        { id: 'catches', type: 'fileContains', file: 'main.py', pattern: 'apply_catch' },
        { id: 'ends', type: 'fileContains', file: 'main.py', pattern: 'is_over' },
        { id: 'quits', type: 'fileContains', file: 'main.py', pattern: 'pygame\\.quit' },
      ],
      solution: `"""Starfall — the pygame shell. Run: python main.py"""

import random

import pygame

from game import (
    HEIGHT,
    PLAYER_SPEED,
    PLAYER_WIDTH,
    ROUND_SECONDS,
    SPAWN_EVERY,
    WIDTH,
    apply_catch,
    caught,
    clamp_player,
    is_over,
    spawn_star,
    update_stars,
)

BG = (10, 12, 22)
PLAYER_COLOR = (124, 240, 212)
STAR_COLOR = (255, 209, 102)
BOMB_COLOR = (255, 92, 122)
TEXT_COLOR = (226, 232, 245)


def draw(screen, player_x, stars, state, time_left, font):
    screen.fill(BG)
    pygame.draw.rect(
        screen,
        PLAYER_COLOR,
        pygame.Rect(int(player_x - PLAYER_WIDTH / 2), HEIGHT - 48, PLAYER_WIDTH, 16),
        border_radius=8,
    )
    for star in stars:
        color = STAR_COLOR if star["kind"] == "star" else BOMB_COLOR
        pygame.draw.circle(screen, color, (int(star["x"]), int(star["y"])), star["size"] // 2)
    hud = "Score " + str(state["score"]) + "    Lives " + str(state["lives"]) + "    " + str(max(0, int(time_left))) + "s"
    screen.blit(font.render(hud, True, TEXT_COLOR), (18, 16))


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Starfall")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 30)
    rng = random.Random()

    player_x = WIDTH / 2
    stars = []
    state = {"score": 0, "lives": 3}
    time_left = ROUND_SECONDS
    spawn_timer = 0.0
    running = True

    while running:
        dt = min(clock.tick(60) / 1000, 0.05)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r and (is_over(state["lives"]) or time_left <= 0):
                    player_x = WIDTH / 2
                    stars = []
                    state = {"score": 0, "lives": 3}
                    time_left = ROUND_SECONDS
                    spawn_timer = 0.0
                elif event.key == pygame.K_ESCAPE:
                    running = False

        if not is_over(state["lives"]) and time_left > 0:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                player_x = clamp_player(player_x - PLAYER_SPEED * dt)
            if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                player_x = clamp_player(player_x + PLAYER_SPEED * dt)

            spawn_timer += dt
            if spawn_timer >= SPAWN_EVERY:
                spawn_timer = 0.0
                stars.append(spawn_star(rng))

            stars = update_stars(stars, dt)
            for star in list(stars):
                if caught(player_x, star):
                    apply_catch(state, star)
                    stars.remove(star)

            time_left = max(0.0, time_left - dt)

        draw(screen, player_x, stars, state, time_left, font)

        if is_over(state["lives"]) or time_left <= 0:
            message = "Ship down - press R" if is_over(state["lives"]) else "Time's up - press R"
            text = font.render(message, True, TEXT_COLOR)
            screen.blit(text, text.get_rect(center=(WIDTH // 2, HEIGHT // 2)))

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
`,
    },
  ],
  reflectionPrompt: 'Why does game.py stay free of pygame imports, and what does that make easier to test?',
};

export default starfall;
