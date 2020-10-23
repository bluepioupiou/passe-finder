<?php
$this->breadcrumbs=array(
	'Ecoles',
);

$this->menu=array(
	array('label'=>'Create School', 'url'=>array('create')),
	array('label'=>'Manage School', 'url'=>array('admin')),
);
?>

<h1>Ecoles</h1>

<?php $this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'itemView'=>'_view',
)); ?>
