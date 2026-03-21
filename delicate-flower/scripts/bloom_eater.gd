extends CharacterBody2D

var health = 10
var is_taking_damage = false

# --- Patrol ---
var patrol_points: Array = []
var patrol_index: int = 0
var patrol_speed: float = 60.0

# --- Chase ---
var chase_speed: float = 100.0
var detection_range: float = 200.0
var lose_range: float = 300.0

# --- Contatto ---
var contact_range: float = 30.0
var contact_damage: int = 1
var can_deal_contact_damage: bool = true

# --- Stato ---
enum State { PATROL, CHASE }
var state: State = State.PATROL

@onready var player = get_tree().get_first_node_in_group("player")
@onready var ray = $RayCast2D

func _ready():
	for child in get_parent().get_children():
		if child.is_in_group("patrol_point"):
			patrol_points.append(child.global_position)

func _physics_process(delta):
	if not is_instance_valid(player):
		return
	if not is_on_floor():
		velocity += get_gravity() * delta

	_handle_combat()
	_handle_contact_damage()
	_update_state()

	match state:
		State.PATROL:
			_do_patrol(delta)
		State.CHASE:
			_do_chase(delta)

	move_and_slide()

func _handle_combat():
	if player.is_attacking and not is_taking_damage:
		$"Area2D/attack reactor".disabled = false
		if $Area2D.overlaps_body(player):
			take_damage(player.damage)
			$"Area2D/attack reactor".disabled = true
	if health <= 0:
		queue_free()

func _handle_contact_damage():
	if not can_deal_contact_damage:
		return
	var dist = global_position.distance_to(player.global_position)
	if dist <= contact_range:
		player.take_damage(contact_damage)
		can_deal_contact_damage = false
		await get_tree().create_timer(1.0).timeout
		can_deal_contact_damage = true

func _update_state():
	var dist = global_position.distance_to(player.global_position)
	match state:
		State.PATROL:
			if dist <= detection_range and _has_line_of_sight():
				state = State.CHASE
		State.CHASE:
			if dist > lose_range:
				state = State.PATROL

func _do_patrol(_delta):
	if patrol_points.is_empty():
		velocity.x = 0
		return
	var target = patrol_points[patrol_index]
	var dir = target - global_position
	if dir.length() < 200.0:
		patrol_index = (patrol_index + 1) % patrol_points.size()
	else:
		velocity.x = sign(dir.x) * patrol_speed
		_flip_sprite(velocity.x)

func _do_chase(_delta):
	var dir = player.global_position - global_position
	velocity.x = sign(dir.x) * chase_speed
	_flip_sprite(velocity.x)

func _flip_sprite(vx: float):
	if vx != 0:
		$Sprite2D.flip_h = vx < 0

func _has_line_of_sight() -> bool:
	ray.target_position = to_local(player.global_position)
	ray.force_raycast_update()
	return not ray.is_colliding() or ray.get_collider() == player

func take_damage(damage):
	is_taking_damage = true
	$Sprite2D.modulate = Color(1.0, 0.0, 0.0, 0.667)
	await get_tree().create_timer(0.1).timeout
	$Sprite2D.modulate = Color(1, 1, 1, 1)
	health -= damage
	while is_instance_valid(player) and player.is_attacking:
		await get_tree().process_frame
	is_taking_damage = false
