'use client';

import React, { useEffect, useRef } from 'react';

export function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 5 Vibrant 3D Sphere Color Palettes
    const SPHERE_COLORS = [
      { highlight: '#93c5fd', main: '#2563eb', shadow: '#1e40af' }, // Electric Blue
      { highlight: '#c4b5fd', main: '#7c3aed', shadow: '#4c1d95' }, // Pastel Violet
      { highlight: '#f9a8d4', main: '#db2777', shadow: '#831843' }, // Vivid Pink
      { highlight: '#67e8f9', main: '#0891b2', shadow: '#164e63' }, // Cyan Teal
      { highlight: '#fde047', main: '#ea580c', shadow: '#7c2d12' }, // Amber Gold
    ];

    interface Ball3D {
      id: number;
      x: number;
      y: number;
      z: number;
      baseX: number;
      baseY: number;
      baseZ: number;
      radius: number; // Ball Size (24px to 65px)
      colorIndex: number;
      speedX: number;
      speedY: number;
      speedZ: number;
      x2d: number;
      y2d: number;
      renderRadius: number;
    }

    interface Shard {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      color: string;
      life: number;
    }

    const balls: Ball3D[] = [];
    const shards: Shard[] = [];
    const BALL_COUNT = 85; // Exactly 85 Floating 3D Balls!
    let ballIdCounter = 0;

    const createBall = (index?: number): Ball3D => {
      const radius = 24 + Math.random() * 41; // Radii (24px to 65px)
      const x = (Math.random() - 0.5) * (width * 1.35);
      const y = (Math.random() - 0.5) * (height * 1.35);
      const z = Math.random() * 340 - 100;

      return {
        id: ballIdCounter++,
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        radius,
        colorIndex: (index !== undefined ? index : Math.floor(Math.random() * 5)) % SPHERE_COLORS.length,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        speedZ: (Math.random() - 0.5) * 0.3,
        x2d: 0,
        y2d: 0,
        renderRadius: 0,
      };
    };

    for (let i = 0; i < BALL_COUNT; i++) {
      balls.push(createBall(i));
    }

    let cursorX = -1000;
    let cursorY = -1000;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let count = 0;

    // Trigger Ball Explosion Physics
    const shatterBall = (ballIndex: number) => {
      const ball = balls[ballIndex];
      const colorScheme = SPHERE_COLORS[ball.colorIndex];

      // Spawn 20 exploding 3D fragments
      const shardCount = 20;
      for (let s = 0; s < shardCount; s++) {
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        const speed = 4 + Math.random() * 8;

        shards.push({
          x: ball.x2d,
          y: ball.y2d,
          z: ball.z,
          vx: Math.cos(angle) * Math.cos(elevation) * speed,
          vy: Math.sin(angle) * Math.cos(elevation) * speed,
          vz: Math.sin(elevation) * speed,
          radius: 3 + Math.random() * 6,
          color: Math.random() > 0.5 ? colorScheme.main : colorScheme.highlight,
          life: 1.0,
        });
      }

      // Replace shattered ball with a new respawned ball
      balls[ballIndex] = createBall();
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      cursorX = clientX;
      cursorY = clientY;
      targetMouseX = (clientX - width / 2) * 0.15;
      targetMouseY = (clientY - height / 2) * 0.15;

      // Check if cursor touches/hovers over any ball
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        const dx = cursorX - b.x2d;
        const dy = cursorY - b.y2d;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.renderRadius) {
          shatterBall(i);
          break;
        }
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Explode any ball near click/tap radius
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        const dx = clientX - b.x2d;
        const dy = clientY - b.y2d;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.renderRadius + 15) {
          shatterBall(i);
        }
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleResize);

    // 3D Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const fov = 400;
      const cx = width / 2 + mouseX;
      const cy = height / 2 + mouseY;

      count += 0.025;

      // Sort balls by depth (Z-index)
      balls.sort((a, b) => b.z - a.z);

      // Render 3D Floating Balls
      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];

        const waveX = Math.sin(count + ball.baseX * 0.004) * 28;
        const waveY = Math.cos(count * 0.8 + ball.baseY * 0.004) * 28;
        const waveZ = Math.sin(count * 1.2 + i) * 35;

        ball.baseX += ball.speedX;
        ball.baseY += ball.speedY;

        if (Math.abs(ball.baseX) > width * 0.75) ball.speedX *= -1;
        if (Math.abs(ball.baseY) > height * 0.75) ball.speedY *= -1;

        const curX = ball.baseX + waveX;
        const curY = ball.baseY + waveY;
        const curZ = ball.baseZ + waveZ + 180;

        const scale = fov / (fov + curZ);
        ball.x2d = curX * scale + cx;
        ball.y2d = curY * scale + cy;
        ball.renderRadius = Math.max(8, ball.radius * scale);

        if (ball.x2d >= -100 && ball.x2d <= width + 100 && ball.y2d >= -100 && ball.y2d <= height + 100 && scale > 0) {
          const colorScheme = SPHERE_COLORS[ball.colorIndex];

          const gradient = ctx.createRadialGradient(
            ball.x2d - ball.renderRadius * 0.35,
            ball.y2d - ball.renderRadius * 0.35,
            ball.renderRadius * 0.1,
            ball.x2d,
            ball.y2d,
            ball.renderRadius
          );

          gradient.addColorStop(0, colorScheme.highlight);
          gradient.addColorStop(0.5, colorScheme.main);
          gradient.addColorStop(1, colorScheme.shadow);

          ctx.beginPath();
          ctx.arc(ball.x2d, ball.y2d, ball.renderRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = Math.min(0.9, Math.max(0.3, scale * 0.95));
          ctx.shadowBlur = 20 * scale;
          ctx.shadowColor = colorScheme.main;
          ctx.fill();
        }
      }

      // Render Exploding Shards Physics
      for (let s = shards.length - 1; s >= 0; s--) {
        const shard = shards[s];
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += 0.15; // Gravity pull
        shard.life -= 0.03; // Fade out

        if (shard.life <= 0) {
          shards.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(shard.x, shard.y, shard.radius * shard.life, 0, Math.PI * 2);
        ctx.fillStyle = shard.color;
        ctx.globalAlpha = shard.life;
        ctx.shadowBlur = 8;
        ctx.shadowColor = shard.color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-[0] pointer-events-auto cursor-pointer opacity-80"
    />
  );
}
