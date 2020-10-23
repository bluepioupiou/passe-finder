<?php
$this->breadcrumbs=array(
	'Alternatives'=>array('index'),
	$model->id,
);

$this->menu=array(
	array('label'=>'List Alternative', 'url'=>array('index')),
	array('label'=>'Create Alternative', 'url'=>array('create')),
	array('label'=>'Update Alternative', 'url'=>array('update', 'id'=>$model->id)),
	array('label'=>'Delete Alternative', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Are you sure you want to delete this item?')),
	array('label'=>'Manage Alternative', 'url'=>array('admin')),
);
?>

<h1>View Alternative #<?php echo $model->id; ?></h1>

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		'id',
		'positionStart_id',
		'positionAlternative_id',
		'description',
		'dateCreate',
		'dateMaj',
	),
)); ?>
