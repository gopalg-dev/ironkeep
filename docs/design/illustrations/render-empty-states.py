"""IronKeep selected empty-state artwork. Run in a separate Blender background process.

Material colours are generated from src/global.css by scripts/design-illustration-palette.ts.
Each asset is a separate editable scene in empty-states.blend.
No open Blender document is read or changed.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--scenes-only", action="store_true", help="Save editable scenes without rendering PNGs")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
palettes = json.loads((ROOT / "palette.json").read_text())
OUT = ROOT / "renders"
OUT.mkdir(exist_ok=True)
# Background rendering has no desktop thumbnail cache. Keep saving inside the project.
bpy.context.preferences.filepaths.file_preview_type = "NONE"


def linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def material(name, hex_color, metal=0.0, roughness=0.38):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgba = tuple(linear(int(hex_color[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (1,)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = rgba
    return mat


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width = bevel
        mod.segments = 5
        mod = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def box(name, loc, size, mat, bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cylinder(name, loc, radius, depth, mat, axis="Z", bevel=0.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=80, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    if axis == "X":
        obj.rotation_euler.y = math.pi / 2
    return finish(obj, name, mat, bevel)


def tube(name, points, radius, mat, closed=False):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = 5
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    spline.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def profile(name, xy, z, depth, mat, bevel=0.03):
    n = len(xy)
    verts = [(x, y, z + side * depth) for side in (0, 1) for x, y in xy]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat, bevel)


def lifts(m):
    cylinder("Steel bar", (0, 0, 0.75), 0.09, 3.4, m["metal"], "X")
    for side in (-1, 1):
        for x, radius, depth in [(0.98, 0.65, 0.24), (1.22, 0.52, 0.18), (1.41, 0.38, 0.14)]:
            cylinder("Weight plate", (side * x, 0, 0.75), radius, depth, m["ink"], "X", 0.035)
        cylinder("Collar", (side * 1.56, 0, 0.75), 0.15, 0.12, m["muted"], "X")
        for j in range(9):
            cylinder("Grip ring", (side * (0.31 + j * 0.04), 0, 0.75), 0.094, 0.012, m["muted"], "X", 0)


def body(m):
    # A real measurement object, without invented bodyweight or a target.
    box("Scale body", (0, 0.15, 0.19), (2.25, 2.55, 0.32), m["ink"], 0.22)
    box("Scale top", (0, 0.15, 0.37), (2.08, 2.35, 0.09), m["muted"], 0.18)
    box("Blank display inset", (0, 0.83, 0.425), (0.9, 0.43, 0.035), m["paper"], 0.065)
    for x in (-0.53, 0.53):
        box("Foot pad", (x, 0, 0.44), (0.48, 0.7, 0.04), m["ink"], 0.10)
    # Measuring tape lies across the front, its tail curled upward.
    points = []
    for j in range(75):
        t = j / 74
        a = t * math.pi * 3.4
        r = 0.12 + 0.34 * t
        points.append((0.65 + r * math.cos(a), -1.05 + r * math.sin(a), 0.64))
    # Ribbon as a mesh, so it has the flat sides of a tape rather than a rope.
    verts = [(x, y, z + h) for x, y, z in points for h in (-0.12, 0.12)]
    faces = [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(points) - 1)]
    mesh = bpy.data.meshes.new("Tape ribbon")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new("Coiled tape", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(m["paper"])
    solid = obj.modifiers.new("Tape thickness", "SOLIDIFY")
    solid.thickness = 0.018
    box("Tape tail", (-0.35, -1.02, 0.63), (1.2, 0.035, 0.24), m["paper"], 0.016)
    for j in range(8):
        box("Tape tick", (-0.86 + j * 0.14, -1.045, 0.67), (0.015, 0.008, 0.11 if j % 2 == 0 else 0.06), m["ink"], 0.002)


def measurements(m):
    # A soft tailor's tape: upright coil, extended tail and contrasting graduations.
    points = []
    for j in range(161):
        t = j / 160
        a = -math.pi / 2 + t * 4 * math.pi
        r = 0.23 + 0.72 * t
        points.append((-0.25 + r * math.cos(a), 0.25 + r * math.sin(a), 0.5))
    points += [(0.1 + j * 0.1, -0.7, 0.5) for j in range(17)]
    verts = [(x, y, z + h) for x, y, z in points for h in (-0.23, 0.23)]
    faces = [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(points) - 1)]
    mesh = bpy.data.meshes.new("Measuring tape ribbon")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new("Soft measuring tape", mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, "Soft measuring tape", m["ink"])
    solid = obj.modifiers.new("Tape thickness", "SOLIDIFY")
    solid.thickness = 0.025
    for j in range(14):
        box("Tail graduation", (-0.16 + j * 0.13, -0.733, 0.63),
            (0.018, 0.008, 0.17 if j % 5 == 0 else 0.09), m["paper"], 0.002)
    for j in range(28):
        t = 0.5 + j / 56
        a = -math.pi / 2 + t * 4 * math.pi
        r = 0.264 + 0.72 * t
        tick = box("Coil graduation", (-0.25 + r * math.cos(a), 0.25 + r * math.sin(a), 0.63),
                   (0.008, 0.018, 0.17 if j % 5 == 0 else 0.09), m["paper"], 0.002)
        tick.rotation_euler.z = a
    box("Metal tape end", (1.69, -0.7, 0.5), (0.12, 0.045, 0.46), m["metal"], 0.015)


def report(m):
    box("Lower cover", (0, 0, 0.17), (2.15, 2.75, 0.14), m["ink"], 0.09)
    box("Paper block", (0.06, 0, 0.34), (1.94, 2.56, 0.27), m["paper"], 0.055)
    for z in (0.27, 0.33, 0.39):
        tube("Paper edge", [(1.035, -1.2, z), (1.035, 1.2, z)], 0.006, m["muted"])
    box("Upper cover", (0, 0, 0.53), (2.15, 2.75, 0.13), m["ink"], 0.09)
    box("Spine", (-0.98, 0, 0.36), (0.2, 2.65, 0.36), m["ink"], 0.075)
    # Fold motif: two opposing brackets around a bar, echoing the selected mark.
    for side in (-1, 1):
        tube("Fold cover inlay", [(side * 0.24, 0.27, 0.608), (side * 0.52, 0.43, 0.608),
                                  (side * 0.52, -0.43, 0.608), (side * 0.24, -0.27, 0.608)], 0.05, m["paper"])
    box("Fold centre", (0, 0, 0.608), (0.24, 0.12, 0.025), m["paper"], 0.015)
    profile("Ribbon bookmark", [(0.52, -1.15), (0.76, -1.15), (0.76, -1.62), (0.64, -1.51), (0.52, -1.62)], 0.29, 0.04, m["muted"], 0.012)


def setup(name, theme):
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.world = bpy.data.worlds.new(name + " world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    for loc, power, size in [((-3, -4, 7), 500, 5), ((4, 1, 5), 350, 4), ((-1, 4, 3), 250, 3)]:
        data = bpy.data.lights.new("Softbox", "AREA")
        data.energy = power
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new("Softbox", data)
        scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new("Orthographic")
    camera = bpy.data.objects.new("Orthographic", data)
    scene.collection.objects.link(camera)
    loc = (4.8, -7.8, 8.5)
    camera.location = loc
    target = Vector((0, 0, 0.5))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = "ORTHO"
    data.ortho_scale = 4.6
    scene.camera = camera
    p = palettes[theme]
    m = {key: material(name + " " + key, p[token], metal) for key, token, metal in [
        ("ink", "foreground", 0.1), ("paper", "background", 0),
        ("muted", "muted-foreground", 0.1), ("metal", "muted-foreground", 0.65),
    ]}
    return scene, m


ASSETS = {"lifts": lifts, "body": body, "measurements": measurements, "report": report}

for theme in ("light", "dark"):
    for name, build in ASSETS.items():
        key = f"{theme}-{name}"
        scene, materials = setup(key, theme)
        build(materials)
        scene.render.filepath = str(OUT / f"{key}.png")
        if not args.scenes_only:
            bpy.ops.render.render(write_still=True)
            print("RENDERED", key, flush=True)

# Keep every model editable, and open the first illustration on the next launch.
if "light-lifts" in bpy.data.scenes:
    bpy.context.window.scene = bpy.data.scenes["light-lifts"]
if "Scene" in bpy.data.scenes:
    bpy.data.scenes.remove(bpy.data.scenes["Scene"])
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "empty-states.blend"))
