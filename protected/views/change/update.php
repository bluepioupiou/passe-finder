<?php
$this->breadcrumbs=array(
	'Changes'=>array('index'),
	$model->Id=>array('view','id'=>$model->Id),
	'Update',
);

$this->menu=array(
	array('label'=>'List Change', 'url'=>array('index')),
	array('label'=>'Create Change', 'url'=>array('create')),
	array('label'=>'View Change', 'url'=>array('view', 'id'=>$model->Id)),
	array('label'=>'Manage Change', 'url'=>array('admin')),
);
?>

<h1>Update Change <?php echo $model->Id; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>