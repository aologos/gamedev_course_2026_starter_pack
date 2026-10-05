import Phaser from 'phaser';
import {
  BULLETS,
  COLORS,
  MARIO,
  MUSHROOM,
  SOLID_RECTS,
  STOMP,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import { TEXTURES, createGameTextures } from './textures';

type PlayState = 'playing' | 'dead' | 'won';

const HUD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: '20px',
  color: '#ffffff',
};

/**
 * Сцена игры.
 *
 * Порядок работы сцены: init() → create() → update() каждый кадр.
 * init() вызывается при каждом запуске, поэтому состояние уровня обнуляется там.
 * А вот attempts и bestTime живут в полях класса и переживают перезапуск сцены.
 */
export class GameScene extends Phaser.Scene {
  /** Сколько раз грибок уже погибал. Переживает restart. */
  private attempts = 0;
  /** Лучшее время победы в секундах. Переживает restart. */
  private bestTime = Number.POSITIVE_INFINITY;

  private state: PlayState = 'playing';
  private levelTime = 0;

  private mushroom!: Phaser.Physics.Arcade.Sprite;
  private mario!: Phaser.Physics.Arcade.Sprite;
  private mushroomBody!: Phaser.Physics.Arcade.Body;
  private marioBody!: Phaser.Physics.Arcade.Body;

  private platforms: Phaser.GameObjects.Rectangle[] = [];
  private bullets!: Phaser.Physics.Arcade.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'left' | 'right' | 'up' | 'jump', Phaser.Input.Keyboard.Key>;

  /** Куда Марио бежит: -1 влево, 1 вправо. */
  private marioDir = -1;
  private marioNextJumpAt = 0;
  private nextShotAt = 0;

  private statsText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private overlayDim!: Phaser.GameObjects.Rectangle;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayHint!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(): void {
    this.state = 'playing';
    this.levelTime = 0;
    this.marioDir = -1;
    this.platforms = [];
  }

  create(): void {
    createGameTextures(this);

    // Мир шире экрана: за края не выйти, но и сквозь пол провалиться нельзя.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.buildLevel();
    this.createActors();
    this.createBullets();
    this.createInput();
    this.createHud();

    this.physics.add.collider(this.mushroom, this.platforms);
    this.physics.add.collider(this.mario, this.platforms);
    // Марио твёрдый: грибок не проходит сквозь него.
    // Этот же коллайдер ловит и приземление сверху — см. onMarioTouch().
    this.physics.add.collider(this.mushroom, this.mario, this.onMarioTouch, undefined, this);
    this.physics.add.overlap(this.mushroom, this.bullets, this.onBulletHit, undefined, this);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.mushroom, true, 0.12, 0.12);

    this.nextShotAt = this.time.now + BULLETS.firstShotAt;
    this.input.keyboard?.on('keydown-R', () => this.scene.restart());
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'playing') return;

    this.levelTime += delta / 1000;
    this.updateMushroom();
    this.updateMario();
    this.updateShooting();
    this.recycleBullets();
    this.updateHud();
  }

  // ---------------------------------------------------------------- уровень

  /** Рисует все платформы и делает их неподвижными телами. */
  private buildLevel(): void {
    for (const rect of SOLID_RECTS) {
      const platform = this.add
        .rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, COLORS[rect.kind])
        .setStrokeStyle(2, COLORS[`${rect.kind}Edge`]);

      // Статическое тело берёт размеры из прямоугольника.
      this.physics.add.existing(platform, true);
      this.platforms.push(platform);
    }
  }

  private createActors(): void {
    this.mushroom = this.physics.add.sprite(MUSHROOM.start.x, MUSHROOM.start.y, TEXTURES.mushroom);
    this.mushroomBody = this.mushroom.body as Phaser.Physics.Arcade.Body;
    this.mushroomBody.setSize(MUSHROOM.bodySize.width, MUSHROOM.bodySize.height, true);
    this.mushroom.setMaxVelocity(MUSHROOM.speed, MUSHROOM.maxFallSpeed);
    this.mushroom.setDragX(MUSHROOM.drag);

    this.mario = this.physics.add.sprite(MARIO.start.x, MARIO.start.y, TEXTURES.mario);
    this.marioBody = this.mario.body as Phaser.Physics.Arcade.Body;
    this.marioBody.setSize(MARIO.bodySize.width, MARIO.bodySize.height, true);
    // Марио тяжелее грибка, поэтому от напора не сдвигается.
    this.mario.setMass(4);
  }

  /**
   * Пул пуль. maxSize не даст создать больше, чем нужно,
   * а getFirstDead() переиспользует уже вылетевшие пули вместо новых.
   */
  private createBullets(): void {
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: BULLETS.maxSize,
      allowGravity: false,
      immovable: true,
    });
  }

  private createInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Record<'left' | 'right' | 'up' | 'jump', Phaser.Input.Keyboard.Key>;
  }

  private createHud(): void {
    // setScrollFactor(0) прикрепляет объект к экрану: камера едет по уровню,
    // а HUD остаётся на месте.
    this.statsText = this.add.text(24, 20, '', HUD_STYLE).setScrollFactor(0);
    this.hintText = this.add
      .text(24, VIEW_HEIGHT - 44, 'A / D — бег, W или пробел — прыжок, R — начать заново', {
        ...HUD_STYLE,
        fontSize: '16px',
        color: '#e2e8f0',
      })
      .setScrollFactor(0)
      .setAlpha(0.85);

    this.overlayDim = this.add
      .rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x0f172a, 0.72)
      .setScrollFactor(0)
      .setVisible(false);
    this.overlayTitle = this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 24, '', { ...HUD_STYLE, fontSize: '48px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
    this.overlayHint = this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 44, '', { ...HUD_STYLE, fontSize: '20px', color: '#fde047' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    this.overlayTitle.setDepth(1);
    this.overlayHint.setDepth(1);
  }

  private updateHud(): void {
    const best = Number.isFinite(this.bestTime) ? `   рекорд: ${this.bestTime.toFixed(1)} с` : '';
    this.statsText.setText(`Попыток: ${this.attempts}   время: ${this.levelTime.toFixed(1)} с${best}`);
  }

  // -------------------------------------------------------------- игрок

  private updateMushroom(): void {
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;

    if (left !== right) {
      this.mushroom.setAccelerationX((right ? 1 : -1) * MUSHROOM.acceleration);
    } else {
      this.mushroom.setAccelerationX(0);
    }

    if (this.isJumpPressed() && this.mushroomBody.blocked.down) {
      this.mushroom.setVelocityY(MUSHROOM.jumpVelocity);
    }

    // Короткий прыжок: отпустил кнопку на лету — срезали остаток высоты.
    if (this.isJumpReleased() && this.mushroomBody.velocity.y < 0) {
      this.mushroom.setVelocityY(this.mushroomBody.velocity.y * MUSHROOM.jumpCut);
    }
  }

  /** Прыжок работает и на стрелках, и на пробеле — все четыре клавиши сразу. */
  private jumpKeys(): Phaser.Input.Keyboard.Key[] {
    return [this.cursors.up, this.cursors.space, this.keys.up, this.keys.jump];
  }

  private isJumpPressed(): boolean {
    return this.jumpKeys().some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  private isJumpReleased(): boolean {
    return this.jumpKeys().some((key) => Phaser.Input.Keyboard.JustUp(key));
  }

  // -------------------------------------------------------------- Марио

  /**
   * Марио убегает от грибка, а когда тот далеко — спокойно патрулирует
   * и перепрыгивает ступеньки. У краёв мира разворачивается.
   */
  private updateMario(): void {
    const dx = this.mushroom.x - this.mario.x;
    const distance = Math.abs(dx);
    const isFleeing = distance < MARIO.fleeDistance;

    let direction = isFleeing ? (dx > 0 ? -1 : 1) : this.marioDir;

    if (this.mario.x <= MARIO.edgeMargin) direction = 1;
    if (this.mario.x >= WORLD_WIDTH - MARIO.edgeMargin) direction = -1;

    this.marioDir = direction;
    this.mario.setVelocityX(direction * (isFleeing ? MARIO.fleeSpeed : MARIO.patrolSpeed));
    this.mario.setFlipX(direction < 0);

    const isOnGround = this.marioBody.blocked.down;
    const hitStep = this.marioBody.blocked.left || this.marioBody.blocked.right;
    const isPanicked = isFleeing && distance < MARIO.panicDistance;

    if (isOnGround && (hitStep || isPanicked) && this.time.now >= this.marioNextJumpAt) {
      this.mario.setVelocityY(MARIO.jumpVelocity);
      this.marioNextJumpAt = this.time.now + MARIO.jumpCooldown;
    }
  }

  // -------------------------------------------------------------- пули

  private updateShooting(): void {
    if (this.time.now < this.nextShotAt) return;

    this.nextShotAt = this.time.now + BULLETS.interval;
    this.shoot();
  }

  private shoot(): void {
    const bullet = this.bullets.getFirstDead(true, 0, 0, TEXTURES.bullet) as
      | Phaser.Physics.Arcade.Sprite
      | null;

    if (!bullet) return;

    const facing = this.marioDir >= 0 ? 1 : -1;
    const x = this.mario.x + facing * BULLETS.spawnOffset;
    const y = this.mario.y - 6;

    // Пуля летит по прямой в сторону грибка на момент выстрела.
    const angle =
      Phaser.Math.Angle.Between(x, y, this.mushroom.x, this.mushroom.y) * Phaser.Math.RAD_TO_DEG;
    const velocity = this.physics.velocityFromAngle(angle, BULLETS.speed);

    bullet.setActive(true).setVisible(true).setPosition(x, y);
    (bullet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    bullet.setVelocity(velocity.x, velocity.y);
  }

  /** Улетевшие за пределы мира пули возвращаются в пул. */
  private recycleBullets(): void {
    for (const child of this.bullets.getChildren()) {
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (!bullet.active) continue;

      const isOut =
        bullet.x < -BULLETS.killMargin ||
        bullet.x > WORLD_WIDTH + BULLETS.killMargin ||
        bullet.y < -BULLETS.killMargin ||
        bullet.y > WORLD_HEIGHT + BULLETS.killMargin;

      if (isOut) bullet.setActive(false).setVisible(false);
    }
  }

  private onBulletHit(): void {
    this.lose();
  }

  // -------------------------------------------------------- столкновения

  /**
   * Срабатывает от коллайдера грибок ↔ Марио уже после того, как тела разведены.
   * Грибок, приземлившийся сверху, оказывается ровно на макушке Марио,
   * а тот, кто подошёл сбоку, остаётся с ним на одной высоте.
   */
  private onMarioTouch(): void {
    if (this.state !== 'playing') return;

    const isAbove = this.mushroomBody.center.y < this.marioBody.center.y;
    const isOnHead = this.mushroomBody.bottom - this.marioBody.top <= STOMP.tolerance;

    if (isAbove && isOnHead) this.win();
  }

  // ------------------------------------------------------------- финалы

  private win(): void {
    this.state = 'won';
    this.bestTime = Math.min(this.bestTime, this.levelTime);

    // Грибок отскакивает от макушки. Скорость задаётся после разведения тел,
    // поэтому её не затрёт физика этого же кадра.
    this.mushroom.setVelocityY(STOMP.bounceVelocity);
    this.mushroom.setVelocityX(Math.sign(this.mushroom.x - this.mario.x) * STOMP.pushVelocity);

    this.marioBody.checkCollision.none = true;
    this.mario.setVelocity(0, 0);
    this.cameras.main.shake(220, 0.006);

    this.tweens.add({
      targets: this.mario,
      angle: 360,
      y: this.mario.y + 260,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeIn',
      onComplete: () => this.mario.setActive(false).setVisible(false),
    });

    this.showOverlay('МАРИО ПОВЕРЖЕН', `${this.levelTime.toFixed(1)} с   ·   R — сыграть ещё раз`);
  }

  private lose(): void {
    // Проверка обязательна: пересечение с пулями срабатывает каждый физический шаг,
    // пока грибок стоит в луче. Без неё одна смерть считалась бы десятками.
    if (this.state !== 'playing') return;

    this.state = 'dead';
    this.attempts += 1;

    this.mushroom.setVelocity(0, 0);
    this.mushroomBody.setAllowGravity(false);
    this.mushroom.setTint(0x6b7280);
    this.cameras.main.shake(260, 0.008);

    for (const child of this.bullets.getChildren()) {
      (child as Phaser.Physics.Arcade.Sprite).setActive(false).setVisible(false);
    }

    this.showOverlay('ТЫ ПРОИГРАЛ', `Попыток: ${this.attempts}   ·   R — начать заново`);
  }

  private showOverlay(title: string, hint: string): void {
    this.updateHud();
    this.overlayTitle.setText(title);
    this.overlayHint.setText(hint);
    this.overlayDim.setVisible(true);
    this.overlayTitle.setVisible(true);
    this.overlayHint.setVisible(true);
  }
}
