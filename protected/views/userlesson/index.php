<?php
$this->breadcrumbs=array(
	'User Lessons',
);

$this->menu=array(
	array('label'=>'Create UserLesson', 'url'=>array('create')),
	array('label'=>'Manage UserLesson', 'url'=>array('admin')),
);
?>

<h1>User Lessons</h1>

<?php $this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'itemView'=>'_view',
)); ?>
