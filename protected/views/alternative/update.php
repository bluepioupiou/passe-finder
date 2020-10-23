<?php
$this->breadcrumbs=array(
	'Alternatives'=>array('index'),
	$model->id=>array('view','id'=>$model->id),
	'Update',
);

$this->menu=array(
	array('label'=>'List Alternative', 'url'=>array('index')),
	array('label'=>'Create Alternative', 'url'=>array('create')),
	array('label'=>'View Alternative', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage Alternative', 'url'=>array('admin')),
);
?>

<h1>Update Alternative <?php echo $model->id; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>