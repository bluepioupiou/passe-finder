<?php
$this->breadcrumbs=array(
	'User Lessons'=>array('index'),
	$model->id,
);

$this->menu=array(
	array('label'=>'List UserLesson', 'url'=>array('index')),
	array('label'=>'Create UserLesson', 'url'=>array('create')),
	array('label'=>'Update UserLesson', 'url'=>array('update', 'id'=>$model->id)),
	array('label'=>'Delete UserLesson', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Are you sure you want to delete this item?')),
	array('label'=>'Manage UserLesson', 'url'=>array('admin')),
);
?>

<h1>View UserLesson #<?php echo $model->id; ?></h1>

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		'id',
		'lesson_id',
		'user_id',
		'pending',
	),
)); ?>
