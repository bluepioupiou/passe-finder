<?php
$this->breadcrumbs=array(
	'Danses'=>array('index'),
	$model->name=>array('view','id'=>$model->id),
	'Update',
);

$this->menu=array(
	array('label'=>'List Danse', 'url'=>array('index')),
	array('label'=>'Create Danse', 'url'=>array('create')),
	array('label'=>'View Danse', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage Danse', 'url'=>array('admin')),
);
?>

<h1>Update Danse <?php echo $model->id; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>