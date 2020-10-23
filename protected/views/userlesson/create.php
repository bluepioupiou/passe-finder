<?php
$this->breadcrumbs=array(
	'User Lessons'=>array('index'),
	'Create',
);

$this->menu=array(
	array('label'=>'List UserLesson', 'url'=>array('index')),
	array('label'=>'Manage UserLesson', 'url'=>array('admin')),
);
?>

<h1>Create UserLesson</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>