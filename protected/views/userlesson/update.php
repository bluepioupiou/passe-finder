<?php
$this->breadcrumbs=array(
	'User Lessons'=>array('index'),
	$model->id=>array('view','id'=>$model->id),
	'Update',
);

$this->menu=array(
	array('label'=>'List UserLesson', 'url'=>array('index')),
	array('label'=>'Create UserLesson', 'url'=>array('create')),
	array('label'=>'View UserLesson', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage UserLesson', 'url'=>array('admin')),
);
?>

<h1>Update UserLesson <?php echo $model->id; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>