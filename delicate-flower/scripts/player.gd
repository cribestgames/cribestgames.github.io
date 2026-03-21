extends CharacterBody2D

@onready var coyote_timer: Timer = $CoyoteTimer
@onready var jump_buffer_timer: Timer = $JumpBufferTimer

var health = 3
var damage = 5
var coyote_time_activared: bool = false
var fullscreen = false
var is_attacking: bool = false

const JUMP_HIGHT: float = -310.0
var gravity: float = 12.0
const MAX_GRAVITY: float = 14.5
const BOUNCE_HIEGHT: float = -430.0
const MAX_SPEED: float = 140
const ACCELERATION: float = 8
const FRICTION: float = 10
const GRAVITY_WALL: float = 8.5
const WALL_PUSH_FORCE: float = 100.0
var wall_contact_coyote: float = 0.0

func bounce():
	velocity.y = BOUNCE_HIEGHT

func full_screen():
	if fullscreen == false and Input.is_action_just_pressed("fullscreen"):
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN)
		fullscreen = true

func _ready() -> void:
	fullscreen = false
	add_to_group("player")
	$AnimatedSprite2D.animation_finished.connect(_on_attack_finished)

func _on_attack_finished() -> void:
	if $AnimatedSprite2D.animation == "attack":
		is_attacking = false
		$AnimatedSprite2D.position.y += 0.5
		$AnimatedSprite2D.play("idle")

func _physics_process(delta: float) -> void:
	full_screen()

	# --- Se sta attaccando blocca tutto tranne la gravità ---
	if is_attacking:
		velocity.x = lerp(velocity.x, 0.0, delta * FRICTION)
		velocity.y += gravity
		move_and_slide()
		return

	var x_input: float = Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	var velocity_weight: float = delta * (ACCELERATION if x_input else FRICTION)
	velocity.x = lerp(velocity.x, x_input * MAX_SPEED, velocity_weight)

	if is_on_floor():
		coyote_time_activared = false
		gravity = lerp(gravity, 12.0, 12.0 * delta)
	else:
		if coyote_timer.is_stopped() and !coyote_time_activared:
			coyote_timer.start()
			coyote_time_activared = true

		if Input.is_action_just_released("jump") or is_on_ceiling():
			velocity.y *= 0.5

		gravity = lerp(gravity, MAX_GRAVITY, 12.0 * delta)

	if Input.is_action_just_pressed("jump"):
		if jump_buffer_timer.is_stopped():
			jump_buffer_timer.start()

	if !jump_buffer_timer.is_stopped() and (!coyote_timer.is_stopped() or is_on_floor()):
		velocity.y = JUMP_HIGHT
		jump_buffer_timer.stop()
		coyote_timer.stop()
		coyote_time_activared = true

	if velocity.y > 30 and velocity.y < -5 and abs(velocity.x) > 3:
		if $LeftLedgeHop.is_colliding() and !$LeftLedgeHop2.is_colliding() and velocity.x < 0:
			velocity.y += JUMP_HIGHT/3.25
		if $RightLedgeHop.is_colliding() and !$RightLedgeHop2.is_colliding() and velocity.x > 0:
			velocity.y += JUMP_HIGHT/3.25

	velocity.y += gravity

	# --- Attacco ---
	if Input.is_action_just_pressed("attack"):
		is_attacking = true
		$AnimatedSprite2D.position.y -= 0.5
		$AnimatedSprite2D.play("attack")

	# --- Animazioni movimento ---
	if !is_attacking:
		if x_input != 0:
			$AnimatedSprite2D.play("walk")
			$AnimatedSprite2D.flip_h = x_input < 0
		else:
			if $AnimatedSprite2D.animation != "idle":
				$AnimatedSprite2D.play("idle")

	move_and_slide()
	
func take_damage(dmg: int):
	health -= dmg
	$AnimatedSprite2D.modulate = Color(1.0, 0.0, 0.0, 0.667)
	await get_tree().create_timer(0.1).timeout
	$AnimatedSprite2D.modulate = Color(1, 1, 1, 1)
	if health <= 0:
		queue_free()
