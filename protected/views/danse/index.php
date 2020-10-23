<?php
$this->breadcrumbs=array(
	'Danses',
);

$this->menu=array(
	array('label'=>'Create Danse', 'url'=>array('create')),
	array('label'=>'Manage Danse', 'url'=>array('admin')),
);
?>

<h1>Danses</h1>

<?php $this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'itemView'=>'_view',
)); ?>
