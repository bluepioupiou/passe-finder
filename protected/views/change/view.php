<?php
$this->breadcrumbs=array(
	'Changes'=>array('index'),
	$model->Id,
);

$this->menu=array(
	array('label'=>'List Change', 'url'=>array('index')),
	array('label'=>'Create Change', 'url'=>array('create')),
	array('label'=>'Update Change', 'url'=>array('update', 'id'=>$model->Id)),
	array('label'=>'Delete Change', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->Id),'confirm'=>'Are you sure you want to delete this item?')),
	array('label'=>'Manage Change', 'url'=>array('admin')),
);
?>

<h1>View Change #<?php echo $model->Id; ?></h1>

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		'Id',
		'Type',
		'Texte',
		'Date',
	),
)); ?>
