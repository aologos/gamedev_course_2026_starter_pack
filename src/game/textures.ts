import Phaser from 'phaser';

/**
 * Спрайты рисуются кодом, без файлов картинок.
 *
 * Каждый рисунок временно создаётся через Graphics, а потом «запекается»
 * в текстуру (generateTexture) и сразу удаляется. Дальше Graphics больше не нужен:
 * в игре летают обычные спрайты, у которых есть физическое тело.
 */
export const TEXTURES = {
  mushroom: 'mushroom',
  mario: 'mario',
  bullet: 'bullet',
} as const;

/** Вызывается один раз в начале сцены, до создания спрайтов. */
export function createGameTextures(scene: Phaser.Scene): void {
  drawMushroom(scene);
  drawMario(scene);
  drawBullet(scene);
}

/** Грибок: кремовая ножка и красная шляпка с белыми пятнами. Смотрит вниз. */
function drawMushroom(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0xf6e7c8, 1);
  g.fillRoundedRect(12, 25, 20, 17, 5);

  g.fillStyle(0xd9403f, 1);
  g.fillCircle(22, 17, 15);

  g.fillStyle(0xf7f3ec, 1);
  g.fillCircle(14, 11, 4);
  g.fillCircle(29, 10, 3.5);
  g.fillCircle(21, 23, 3);

  g.fillStyle(0x1f2937, 1);
  g.fillCircle(17, 33, 2.2);
  g.fillCircle(27, 33, 2.2);

  g.generateTexture(TEXTURES.mushroom, 44, 44);
  g.destroy();
}

/** Марио: красная шапка и куртка, синие шорты, коричневые усы. Смотрит вправо. */
function drawMario(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0x3b2412, 1);
  g.fillRoundedRect(9, 39, 12, 7, 2);
  g.fillRoundedRect(23, 39, 12, 7, 2);

  g.fillStyle(0x2b52c8, 1);
  g.fillRoundedRect(11, 26, 22, 15, 3);

  g.fillStyle(0xd62828, 1);
  g.fillRoundedRect(11, 15, 22, 13, 3);

  g.fillStyle(0xf3c39b, 1);
  g.fillCircle(22, 12, 9);

  g.fillStyle(0xd62828, 1);
  g.fillRoundedRect(12, 2, 21, 7, 3);
  g.fillRoundedRect(27, 7, 9, 4, 2);

  g.fillStyle(0x2b1b12, 1);
  g.fillRoundedRect(20, 14, 9, 3, 1);

  g.fillStyle(0x1f2937, 1);
  g.fillCircle(26, 11, 2);

  g.generateTexture(TEXTURES.mario, 44, 48);
  g.destroy();
}

/** Пуля Марио: тёмный шарик с жёлтой сердцевиной. */
function drawBullet(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0x1f2937, 1);
  g.fillCircle(8, 8, 7);

  g.fillStyle(0xfde047, 1);
  g.fillCircle(8, 8, 3.5);

  g.generateTexture(TEXTURES.bullet, 16, 16);
  g.destroy();
}
