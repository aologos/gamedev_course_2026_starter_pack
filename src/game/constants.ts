/**
 * Все игровые числа и данные уровня в одном месте.
 *
 * Здесь нет логики — только значения, которые можно подкрутить без правки кода:
 * если играть неудобно, крутим числа здесь, а не ищем их по GameScene.
 */

/** Размер экрана: столько пикселей видит игрок. */
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 640;

/** Размер мира: уровень шире экрана, камера едет за грибком. */
export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 640;

export const COLORS = {
  sky: 0x87ceeb,
  ground: 0x8b5a2b,
  groundEdge: 0x5b3a1a,
  floating: 0x4f9d5a,
  floatingEdge: 0x2f6b39,
  step: 0xc2410c,
  stepEdge: 0x7c2d12,
} as const;

/** За что платформа отвечает — от этого зависит только цвет. */
export type PlatformKind = 'ground' | 'floating' | 'step';

/** Прямоугольник платформы: левый верхний угол плюс размер. */
export interface PlatformRect {
  readonly kind: PlatformKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Верх земли. Всё, что ниже этой линии, — земля. */
export const GROUND_TOP = 560;

/** Гравитация мира. С ней прыжок грибка -760 даёт ~170 px высоты и ~0.9 с полёта. */
export const WORLD_GRAVITY = 1700;

const FLOATING_HEIGHT = 22;
const STEP_WIDTH = 44;

export const GROUND: PlatformRect = {
  kind: 'ground',
  x: 0,
  y: GROUND_TOP,
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT - GROUND_TOP,
};

/** Парящая платформа на заданной высоте. */
function floating(x: number, y: number, width: number): PlatformRect {
  return { kind: 'floating', x, y, width, height: FLOATING_HEIGHT };
}

/** Низкая ступенька на земле: Марио через неё перепрыгивает, грибок обходит. */
function step(x: number, height: number): PlatformRect {
  return { kind: 'step', x, y: GROUND_TOP - height, width: STEP_WIDTH, height };
}

/**
 * Парящие платформы — цепочка от левого края к правому.
 * Подобрано так, чтобы грибок долетал между ними: шаг вверх не больше 130 px,
 * разрыв по горизонтали не больше 180 px (прыжок даёт ~250 px).
 */
export const FLOATING_PLATFORMS: readonly PlatformRect[] = [
  floating(180, 450, 170),
  floating(460, 370, 160),
  floating(730, 470, 180),
  floating(1020, 380, 170),
  floating(1300, 300, 190),
  floating(1650, 430, 180),
  floating(1960, 340, 180),
  floating(2300, 450, 180),
  floating(2640, 360, 190),
  floating(2960, 470, 180),
];

/** Ступеньки короче любого прыжка Марио (-700 даёт ~144 px). */
export const STEPS: readonly PlatformRect[] = [step(960, 70), step(2180, 60)];

/** Все твёрдые поверхности уровня — с этим массивом работают коллайдеры. */
export const SOLID_RECTS: readonly PlatformRect[] = [GROUND, ...FLOATING_PLATFORMS, ...STEPS];

export const MUSHROOM = {
  start: { x: 120, y: 470 },
  speed: 300,
  acceleration: 1600,
  drag: 2000,
  /** Минус — вверх. */
  jumpVelocity: -760,
  /** Насколько укорачивается прыжок, если отпустить кнопку в начале. */
  jumpCut: 0.45,
  maxFallSpeed: 900,
  /** Физическое тело чуть меньше спрайта, чтобы не цепляться за края платформ. */
  bodySize: { width: 34, height: 42 },
} as const;

export const MARIO = {
  start: { x: 2400, y: 470 },
  /** Скорость погони и скорость спокойного патруля. */
  fleeSpeed: 190,
  patrolSpeed: 70,
  /** Минус — вверх. Достаточно, чтобы перепрыгнуть ступеньку. */
  jumpVelocity: -700,
  /** Ближе этого расстояния Марио убегает, дальше — просто патрулирует. */
  fleeDistance: 220,
  /** На таком расстоянии он ещё и подпрыгивает от страха. */
  panicDistance: 110,
  jumpCooldown: 700,
  /** Не подходит совсем близко к краям мира, чтобы не упираться в границу. */
  edgeMargin: 40,
  bodySize: { width: 28, height: 44 },
} as const;

export const BULLETS = {
  /** Больше пуль одновременно летать не будет — взятые из пула переиспользуются. */
  maxSize: 12,
  speed: 420,
  /** Первая пуля вылетает не сразу, чтобы игрок успел разбежаться. */
  firstShotAt: 1200,
  interval: 1500,
  /** Пуля появляется чуть дальше тела Марио, чтобы не попасть в него сразу. */
  spawnOffset: 26,
  /** За пределами мира на такое расстояние пуля считается пропавшей. */
  killMargin: 60,
} as const;

export const STOMP = {
  /** Столько пикселей допускается между подошвой грибка и головой Марио. */
  tolerance: 18,
  /** Грибок подпрыгивает после удара. */
  bounceVelocity: -450,
  /** И отлетает в сторону, откуда пришёл. */
  pushVelocity: 140,
} as const;
