<?php
$this->breadcrumbs=array(
	'Videos'=>array('index'),
	$model->name=>array('view','id'=>$model->id),
	'Modification',
);

$this->menu=array(
	array('label'=>'List Video', 'url'=>array('index')),
	array('label'=>'Create Video', 'url'=>array('create')),
	array('label'=>'View Video', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage Video', 'url'=>array('admin')),
);
?>

<h1>Mettre à jour <?php echo $model->name; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>