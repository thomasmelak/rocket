import { Color, SRGBColorSpace, Vector3, type Material } from 'three';

// Repaints the hull by rotating the hue of its base color texture instead of
// multiplying it by `material.color` (which turns the orange texture muddy for
// any non-warm color). Rust, panel lines and wear keep their relative shading.

// Median HSV of the saturated pixels of the original orange texture.
const BASE_PAINT_HSV = new Vector3(0.033, 0.8, 0.55);

// Shared by every patched material, so the 1K and 4K models stay in sync and
// updates never need a shader recompile.
const uniforms = {
	uPaintBase: { value: BASE_PAINT_HSV },
	uPaintTarget: { value: new Vector3() },
	uPaintStrength: { value: 0 }
};

const GLSL = /* glsl */ `
uniform vec3 uPaintBase;
uniform vec3 uPaintTarget;
uniform float uPaintStrength;

vec3 paintRgbToHsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 paintHsvToRgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

vec3 repaint(vec3 linearColor) {
	if (uPaintStrength <= 0.0) return linearColor;
	// Work in (approximate) sRGB so the hue shift matches what the picker shows.
	vec3 hsv = paintRgbToHsv(pow(max(linearColor, 0.0), vec3(1.0 / 2.2)));
	vec3 painted = vec3(
		fract(hsv.x + uPaintTarget.x - uPaintBase.x),
		clamp(hsv.y * uPaintTarget.y / uPaintBase.y, 0.0, 1.0),
		hsv.z * clamp(uPaintTarget.z / uPaintBase.z, 0.25, 1.25)
	);
	vec3 result = pow(paintHsvToRgb(painted), vec3(2.2));
	// Only the painted (saturated) areas change; bare grey metal stays as it is.
	float paintMask = smoothstep(0.1, 0.4, hsv.y);
	return mix(linearColor, result, paintMask * uPaintStrength);
}
`;

export function applyShipPaint(material: Material) {
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, uniforms);
		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', `#include <common>\n${GLSL}`)
			.replace(
				'#include <map_fragment>',
				'#include <map_fragment>\ndiffuseColor.rgb = repaint(diffuseColor.rgb);'
			);
	};
	material.customProgramCacheKey = () => 'ship-paint';
	material.needsUpdate = true;
}

const hsl = { h: 0, s: 0, l: 0 };

export function setShipPaint(hex: string, strength: number) {
	// Three's Color has HSL but not HSV, so convert HSL -> HSV here.
	new Color(hex).getHSL(hsl, SRGBColorSpace);
	const v = hsl.l + hsl.s * Math.min(hsl.l, 1 - hsl.l);
	const s = v === 0 ? 0 : 2 * (1 - hsl.l / v);
	uniforms.uPaintTarget.value.set(hsl.h, s, v);
	uniforms.uPaintStrength.value = strength;
}
