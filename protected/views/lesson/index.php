<?php
$this->breadcrumbs=array(
	'cours',
);

$this->menu=array(
	array('label'=>'Create Lesson', 'url'=>array('create')),
	array('label'=>'Manage Lesson', 'url'=>array('admin')),
);
?>

<h1>Cours</h1>

<?php $this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'itemView'=>'_view',
)); ?>
