extends Node2D

var level_coord_y = 0
var level_coord_x = 0
var level = "level_" + str(level_coord_x) + "," + str(level_coord_y)
var res_level = "res://" + "scenes/levels/" + level + ".tscn"
var current_node

func _ready():
	current_node = $"level0,0"

func _process(delta):
	if $Player.position.x > 325:
		change_level(1, 0)
	elif $Player.position.x < -325:
		change_level(-1, 0)
	if $Player.position.y > 145:
		change_level(0, -1)
	elif $Player.position.y < -210:
		change_level(0,  1)

func change_level(x, y):
	level_coord_x += x
	level_coord_y += y
	var level = "level_" + str(level_coord_x) + "," + str(level_coord_y)
	var res_level = "res://scenes/levels/" + level + ".tscn"
	var new_scene = load(res_level)
	var new_node = new_scene.instantiate()
	var parent = current_node.get_parent()
	parent.add_child(new_node)
	current_node.queue_free()
	current_node = new_node
	if x == 1:
		$Player.position.x = -325.0
	if x == -1:
		$Player.position.x = 325.0
	if y == 1:
		$Player.position.y = 115.0
	if y == -1:
		$Player.position.y = -210.0
