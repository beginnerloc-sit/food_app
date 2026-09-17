import React, { useRef } from "react";
import { ViewStyle } from "react-native";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";

interface Props {
  size?: number;
  style?: ViewStyle;
}

/**
 * A bespoke 3D object built entirely in code with three.js + expo-gl:
 * an off-white plate with a clay rim and three floating "food" spheres in the
 * Nordic palette, softly lit and slowly rotating. No external model files.
 */
export function Plate3D({ size = 220, style }: Props) {
  const rafRef = useRef<number | null>(null);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0); // transparent

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 2.6, 4.2);
    camera.lookAt(0, 0, 0);

    // soft, Nordic lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 7, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd0d8, 0.4);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    const group = new THREE.Group();

    // plate
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.35, 0.22, 72),
      new THREE.MeshStandardMaterial({
        color: 0xfbfaf7,
        roughness: 0.65,
        metalness: 0.05,
      })
    );
    group.add(plate);

    // clay rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.07, 20, 72),
      new THREE.MeshStandardMaterial({ color: 0xc77b58, roughness: 0.5 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.12;
    group.add(rim);

    // food spheres in the Nordic palette
    const foods: { c: number; p: [number, number, number]; r: number }[] = [
      { c: 0xc77b58, p: [-0.45, 0.32, 0.12], r: 0.36 },
      { c: 0x7c9885, p: [0.5, 0.28, -0.18], r: 0.3 },
      { c: 0xd9b26a, p: [0.08, 0.26, 0.5], r: 0.26 },
    ];
    foods.forEach((f) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(f.r, 32, 32),
        new THREE.MeshStandardMaterial({ color: f.c, roughness: 0.4 })
      );
      m.position.set(...f.p);
      group.add(m);
    });

    group.rotation.x = 0.12;
    scene.add(group);

    let bob = 0;
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      group.rotation.y += 0.01;
      bob += 0.03;
      group.position.y = Math.sin(bob) * 0.08;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <GLView
      style={[{ width: size, height: size }, style]}
      onContextCreate={onContextCreate}
    />
  );
}
